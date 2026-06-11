const express = require('express');
const cors = require('cors');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'] }));
app.use(express.json({ limit: '50mb' }));

const anthropic = new Anthropic({ apiKey: process.env.VITE_ANTHROPIC_API_KEY, timeout: 600_000 });

// Screenshot endpoint — uses puppeteer, loaded lazily to speed up startup
app.post('/screenshot', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL обязателен' });

  let browser;
  try {
    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    // Small wait for animations to settle
    await new Promise((r) => setTimeout(r, 500));
    const base64 = await page.screenshot({ type: 'png', encoding: 'base64' });
    res.json({ base64, mimeType: 'image/png' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

// Anthropic proxy — streams SSE back to the client
app.post('/api/messages', async (req, res) => {
  const { model, max_tokens, system, messages } = req.body;

  req.socket.setTimeout(0);
  req.socket.setKeepAlive(true, 15_000);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  console.log(`[${new Date().toISOString()}] /api/messages — ${messages?.length ?? 0} messages, model=${model ?? 'claude-opus-4-7'}`);

  try {
    const stream = anthropic.messages.stream({
      model: model ?? 'claude-opus-4-7',
      max_tokens: max_tokens ?? 8192,
      system,
      messages,
    });

    for await (const event of stream) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
