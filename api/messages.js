// Vercel Serverless Function
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  const { model, max_tokens, system, messages } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log('[messages] key present:', !!process.env.ANTHROPIC_API_KEY, '| model:', model, '| messages:', messages?.length);

  try {
    const s = client.messages.stream({
      model: model ?? 'claude-opus-4-7',
      max_tokens: max_tokens ?? 8192,
      system,
      messages,
    });

    for await (const event of s) {
      res.write(`data: ${JSON.stringify(event)}

`);
    }

    res.write('data: [DONE]

');
    res.end();
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[messages] stream error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error });
    } else {
      res.write(`data: ${JSON.stringify({ error })}\n\n`);
      res.end();
    }
  }
}
