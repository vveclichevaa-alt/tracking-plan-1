import { useState } from 'react';
import type { StoredSession } from '../lib/sessions';
import { groupByDate } from '../lib/sessions';

interface Props {
  sessions: StoredSession[];
  currentId: string | null;
  onSelect: (session: StoredSession) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export function SessionPanel({ sessions, currentId, onSelect, onDelete, onNew }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const groups = groupByDate(sessions);

  if (collapsed) {
    return (
      <div className="flex flex-col items-center w-10 border-r border-gray-200 bg-gray-50 py-3 gap-3 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          title="Открыть панель"
          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          onClick={onNew}
          title="Новый чат"
          className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-56 shrink-0 border-r border-gray-200 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200">
        <button
          onClick={() => setCollapsed(true)}
          title="Свернуть"
          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">История</span>
        <button
          onClick={onNew}
          title="Новый чат"
          className="p-1 rounded hover:bg-blue-100 text-blue-600 transition-colors font-bold text-base leading-none"
        >
          +
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-2">
        {sessions.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-6 px-3">Нет сохранённых сессий</p>
        )}

        {groups.map((group) => (
          <div key={group.label} className="mb-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-3 py-1">
              {group.label}
            </p>
            {group.items.map((session) => {
              const isActive = session.id === currentId;
              const isHovered = hoveredId === session.id;
              return (
                <div
                  key={session.id}
                  className={`relative flex items-center group mx-1 rounded-lg mb-0.5 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-800'
                      : 'hover:bg-gray-200 text-gray-700'
                  }`}
                  onClick={() => onSelect(session)}
                  onMouseEnter={() => setHoveredId(session.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <span className="flex-1 truncate text-xs px-3 py-2 pr-7">
                    {session.title}
                  </span>
                  {isHovered && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(session.id);
                      }}
                      className="absolute right-1.5 p-1 rounded hover:bg-red-100 hover:text-red-600 text-gray-400 transition-colors"
                      title="Удалить"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
