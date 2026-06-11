import type { ChatMessage } from '../lib/types';

interface Props {
  message: ChatMessage;
  onEdit?: () => void;
}

export function MessageBubble({ message, onEdit }: Props) {
  const isUser = message.role === 'user';
  const isWarning = message.isWarning === true;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 group`}>
      {/* Pencil button — shown on hover for user messages */}
      {isUser && onEdit && (
        <button
          onClick={onEdit}
          title="Редактировать"
          className="opacity-0 group-hover:opacity-100 self-center mr-2 p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}

      {!isUser && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm mr-2 mt-1 shrink-0 ${isWarning ? 'bg-amber-100' : 'bg-gray-200'}`}>
          {isWarning ? '⚠' : 'AI'}
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : isWarning
            ? 'bg-amber-50 text-amber-900 border border-amber-300 rounded-bl-sm shadow-sm'
            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
        }`}
      >
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.images.map((img, i) => (
              <img
                key={i}
                src={`data:${img.mimeType};base64,${img.base64}`}
                alt={img.name}
                className="rounded-lg max-h-48 object-contain"
              />
            ))}
          </div>
        )}
        {message.content}
      </div>
    </div>
  );
}
