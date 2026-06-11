import { useCallback, useRef, useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { Chat } from './components/Chat';
import { SessionPanel } from './components/SessionPanel';
import type { ChatMessage, ScreenSource, TrackingPlan } from './lib/types';
import {
  generateId,
  generateTitle,
  loadSessions,
  removeSession,
  upsertSession,
} from './lib/sessions';
import type { StoredSession } from './lib/sessions';
import './index.css';

export default function App() {
  const [sessions, setSessions] = useState<StoredSession[]>(() => loadSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => generateId());
  const [source, setSource] = useState<ScreenSource | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  // Ref so handleUpdate always reads the latest source without being recreated on every upload
  const sourceRef = useRef<ScreenSource | null>(null);
  sourceRef.current = source;

  // Find the active session's saved data for restoring Chat/FileUpload
  const currentSession = sessions.find((s) => s.id === currentSessionId) ?? null;

  const handleUpdate = useCallback(
    (messages: ChatMessage[], plan: TrackingPlan | null) => {
      if (messages.length === 0) return;
      const src = sourceRef.current;
      setSessions((prev) => {
        const session: StoredSession = {
          id: currentSessionId,
          title: generateTitle(messages, src, plan),
          createdAt:
            prev.find((s) => s.id === currentSessionId)?.createdAt ?? new Date().toISOString(),
          messages,
          source: src,
          plan,
        };
        return upsertSession(session, prev);
      });
    },
    [currentSessionId],
  );

  const handleNewSession = useCallback(() => {
    setCurrentSessionId(generateId());
    setSource(null);
    setSessionKey((k) => k + 1);
  }, []);

  const handleSelectSession = useCallback((session: StoredSession) => {
    setCurrentSessionId(session.id);
    setSource(session.source);
    setSessionKey((k) => k + 1);
  }, []);

  const handleDeleteSession = useCallback((id: string) => {
    setSessions((prev) => removeSession(id, prev));
    setCurrentSessionId((cur) => {
      if (cur === id) {
        setSource(null);
        setSessionKey((k) => k + 1);
        return generateId();
      }
      return cur;
    });
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Session history sidebar */}
      <SessionPanel
        sessions={sessions}
        currentId={currentSessionId}
        onSelect={handleSelectSession}
        onDelete={handleDeleteSession}
        onNew={handleNewSession}
      />

      {/* Left panel — file upload */}
      <aside className="w-64 shrink-0 flex flex-col bg-white border-r border-gray-200 shadow-sm">
        <div className="px-4 py-4 border-b border-gray-100">
          <h1 className="text-base font-semibold text-gray-800 leading-tight">
            Трекинг-план
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Альфа-Банк · Аналитическая разметка</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Экран для анализа
          </p>
          <FileUpload
            key={sessionKey}
            onSourceSet={setSource}
            initialSource={currentSession?.source ?? null}
          />
        </div>
      </aside>

      {/* Right panel — chat */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="px-5 py-3 bg-white border-b border-gray-200 flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${source ? 'bg-green-400' : 'bg-gray-300'}`} />
          <span className="text-sm text-gray-600 truncate">
            {source
              ? source.type === 'image'
                ? source.images.length === 1
                  ? source.images[0].name
                  : `Загружено: ${source.images.length} файлов`
                : source.url
              : 'Ожидание загрузки экрана...'}
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <Chat
            key={sessionKey}
            source={source}
            initialMessages={currentSession?.messages}
            initialPlan={currentSession?.plan}
            onUpdate={handleUpdate}
          />
        </div>
      </main>
    </div>
  );
}
