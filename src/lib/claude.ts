import { SYSTEM_PROMPT } from './systemPrompt';
import type { ChatMessage, TrackingPlan } from './types';
import existingEventsData from './existing_events.json';

const SERVER = 'http://localhost:3001';

export async function sendMessage(
  messages: ChatMessage[],
  onChunk: (text: string) => void
): Promise<string> {
  const apiMessages = messages.map((msg) => {
    if (msg.role === 'user' && msg.images && msg.images.length > 0) {
      return {
        role: 'user',
        content: [
          ...msg.images.map((img) => ({
            type: 'image',
            source: { type: 'base64', media_type: img.mimeType, data: img.base64 },
          })),
          { type: 'text', text: msg.content },
        ],
      };
    }
    return { role: msg.role, content: msg.content };
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300_000);

  let response: Response;
  try {
    response = await fetch(`${SERVER}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: apiMessages,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok || !response.body) {
    throw new Error(`Ошибка сервера: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;
      try {
        const event = JSON.parse(data);
        if (event.error) throw new Error(event.error);
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          fullText += event.delta.text;
          onChunk(event.delta.text);
        }
      } catch (parseErr) {
        if (parseErr instanceof SyntaxError) continue;
        throw parseErr;
      }
    }
  }

  return fullText;
}

export interface DuplicateEntry {
  key: string;
  count: number;
}

export function findDuplicates(plan: TrackingPlan): DuplicateEntry[] {
  const seen = new Map<string, number>();
  for (const event of plan.events) {
    const key = `${event.event_category} | ${event.event_label} | ${event.event_name}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const dupes: DuplicateEntry[] = [];
  seen.forEach((count, key) => {
    if (count > 1) dupes.push({ key, count });
  });
  return dupes;
}

export interface LengthViolation {
  eventKey: string;
  action: string;
  object: string;
  object_description: string;
  total: number;
}

export function findLengthViolations(plan: TrackingPlan): LengthViolation[] {
  return plan.events
    .map((e) => ({
      eventKey: `${e.event_category} / ${e.event_label} / ${e.event_name}`,
      action: e.action,
      object: e.object,
      object_description: e.object_description,
      total: e.action.length + e.object.length + e.object_description.length,
    }))
    .filter((v) => v.total > 100);
}

export interface ExistingEventMatch {
  key: string; // "Category | Label | Name"
}

export function checkAgainstExistingEvents(plan: TrackingPlan): ExistingEventMatch[] {
  const db = existingEventsData as { event_category: string; event_label: string; event_name: string }[];
  if (db.length === 0) return [];
  const matches: ExistingEventMatch[] = [];
  for (const ev of plan.events) {
    const found = db.some(
      (ex) =>
        ex.event_category === ev.event_category &&
        ex.event_label === ev.event_label &&
        ex.event_name === ev.event_name,
    );
    if (found) {
      matches.push({ key: `${ev.event_category} | ${ev.event_label} | ${ev.event_name}` });
    }
  }
  return matches;
}

export function stripImagesFromMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => (m.images && m.images.length > 0 ? { ...m, images: [] } : m));
}

export function tryParseTrackingPlan(text: string): TrackingPlan | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.events && Array.isArray(parsed.events)) {
      return parsed as TrackingPlan;
    }
  } catch {
    return null;
  }
  return null;
}
