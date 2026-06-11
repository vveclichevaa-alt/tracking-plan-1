import type { ChatMessage, ScreenSource, TrackingPlan } from './types';

export interface StoredSession {
  id: string;
  title: string;
  createdAt: string; // ISO 8601
  messages: ChatMessage[];
  source: ScreenSource | null;
  plan: TrackingPlan | null;
}

export const SESSION_KEY = 'tracking_plan_sessions';
export const MAX_SESSIONS = 50;

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function generateTitle(
  messages: ChatMessage[],
  source: ScreenSource | null,
  plan: TrackingPlan | null,
): string {
  if (plan && plan.events.length > 0) {
    const e = plan.events[0];
    return e.category_functional || e.event_category || 'Трекинг-план';
  }
  if (source) {
    if (source.type === 'image') {
      return source.images.length === 1
        ? source.images[0].name.replace(/\.[^.]+$/, '')
        : `${source.images.length} экранов`;
    }
    try {
      return new URL(source.url).hostname;
    } catch {
      return source.url;
    }
  }
  const first = messages.find((m) => m.role === 'user' && m.content.trim().length > 0);
  return first ? first.content.slice(0, 50).trim() : 'Новая сессия';
}

export function loadSessions(): StoredSession[] {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession[]) : [];
  } catch {
    return [];
  }
}

export function saveSessions(sessions: StoredSession[]): void {
  let toSave = sessions;
  while (toSave.length > 0) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(toSave));
      return;
    } catch {
      // Quota exceeded — drop oldest session and retry
      toSave = toSave.slice(0, -1);
    }
  }
}

export function upsertSession(
  session: StoredSession,
  prev: StoredSession[],
): StoredSession[] {
  const idx = prev.findIndex((s) => s.id === session.id);
  let updated: StoredSession[];
  if (idx >= 0) {
    updated = prev.map((s) => (s.id === session.id ? session : s));
  } else {
    updated = [session, ...prev];
  }
  updated = updated.slice(0, MAX_SESSIONS);
  saveSessions(updated);
  return updated;
}

export function removeSession(id: string, prev: StoredSession[]): StoredSession[] {
  const updated = prev.filter((s) => s.id !== id);
  saveSessions(updated);
  return updated;
}

type DateGroup = 'Сегодня' | 'Вчера' | 'На этой неделе' | 'Ранее';

export function groupByDate(
  sessions: StoredSession[],
): { label: DateGroup; items: StoredSession[] }[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86_400_000;
  const weekStart = todayStart - 7 * 86_400_000;

  const groups: Record<DateGroup, StoredSession[]> = {
    'Сегодня': [],
    'Вчера': [],
    'На этой неделе': [],
    'Ранее': [],
  };

  for (const s of sessions) {
    const t = new Date(s.createdAt).getTime();
    if (t >= todayStart) groups['Сегодня'].push(s);
    else if (t >= yesterdayStart) groups['Вчера'].push(s);
    else if (t >= weekStart) groups['На этой неделе'].push(s);
    else groups['Ранее'].push(s);
  }

  return (['Сегодня', 'Вчера', 'На этой неделе', 'Ранее'] as DateGroup[]).flatMap((label) =>
    groups[label].length > 0 ? [{ label, items: groups[label] }] : [],
  );
}
