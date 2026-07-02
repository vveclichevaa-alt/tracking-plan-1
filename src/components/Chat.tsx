import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, ScreenSource, TrackingPlan } from '../lib/types';
import { checkAgainstExistingEvents, findDuplicates, findLengthViolations, sendMessage, stripImagesFromMessages, tryParseTrackingPlan } from '../lib/claude';
import { EditChat } from './EditChat';
import { MessageBubble } from './MessageBubble';
import { DownloadPanel } from './DownloadPanel';

interface Props {
  source: ScreenSource | null;
  initialMessages?: ChatMessage[];
  initialPlan?: TrackingPlan | null;
  onUpdate?: (messages: ChatMessage[], plan: TrackingPlan | null) => void;
}

let msgIdCounter = 0;
function makeId() {
  return String(++msgIdCounter);
}

// Extracts OPTIONS: opt1 | opt2 | opt3 from model text
function extractOptions(text: string): string[] {
  const match = text.match(/OPTIONS:\s*(.+)$/m);
  if (!match) return [];
  return match[1]
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Strips the OPTIONS: line so it's not shown in the bubble
function stripOptions(text: string): string {
  return text.replace(/\nOPTIONS:\s*.+$/m, '').trimEnd();
}

// True when the accumulated text is a plan JSON (starts with '{')
function isPlanJson(text: string): boolean {
  return text.trimStart().startsWith('{');
}

export function Chat({ source, initialMessages, initialPlan, onUpdate }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [plan, setPlan] = useState<TrackingPlan | null>(initialPlan ?? null);
  const [planBuilding, setPlanBuilding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, plan]);

  useEffect(() => {
    if (messages.length > 0) {
      onUpdateRef.current?.(messages, plan);
    }
  }, [messages, plan]);

  const triggerAnalysis = async (src: ScreenSource) => {
    let userContent = '';
    let images: ChatMessage['images'];

    if (src.type === 'image') {
      const count = src.images.length;
      userContent =
        count === 1
          ? 'Проанализируй этот экран и начни задавать уточняющие вопросы для создания трекинг-плана.'
          : `Проанализируй эти ${count} экрана одного флоу и начни задавать уточняющие вопросы для создания единого трекинг-плана.`;
      images = src.images;
    } else {
      userContent =
        `Контекст: пользователь работает со страницей ${src.url}. ` +
        `Скриншот будет загружен вручную через блок PNG. ` +
        `Начни задавать уточняющие вопросы для создания трекинг-плана.`;
    }

    const userMsg: ChatMessage = {
      id: makeId(),
      role: 'user',
      content: userContent,
      images,
    };

    const nextMessages = [userMsg];
    setMessages(nextMessages);
    await fetchAssistantReply(nextMessages);
  };

  const sendUserMessage = async (text?: string) => {
    const msgText = (text ?? input).trim();
    if (!msgText || loading) return;
    if (!text) setInput('');

    const userMsg: ChatMessage = { id: makeId(), role: 'user', content: msgText };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    await fetchAssistantReply(nextMessages);
  };

  const startEdit = (msg: ChatMessage) => {
    setEditingId(msg.id);
    setEditText(msg.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async () => {
    if (!editText.trim() || !editingId || loading) return;
    const idx = messages.findIndex((m) => m.id === editingId);
    if (idx === -1) return;

    const editedMsg: ChatMessage = { ...messages[idx], content: editText };
    const newHistory = [...messages.slice(0, idx), editedMsg];

    // Clear plan if it was generated at or after the edit point
    const planMsgIdx = messages.findIndex((m) => m.isHidden && isPlanJson(m.content));
    if (planMsgIdx === -1 || planMsgIdx >= idx) {
      setPlan(null);
      setPlanBuilding(false);
    }

    setMessages(newHistory);
    setEditingId(null);
    setEditText('');
    await fetchAssistantReply(newHistory);
  };

  const fetchAssistantReply = async (history: ChatMessage[], isRetry = false) => {
    setLoading(true);
    setStreamingText('');
    setPlanBuilding(false);

    let accumulated = '';
    try {
      const fullText = await sendMessage(history, (chunk) => {
        accumulated += chunk;
        if (isPlanJson(accumulated)) {
          // Switch to plan-building mode: stop updating the streaming bubble
          setPlanBuilding(true);
        } else {
          setStreamingText(accumulated);
        }
      });

      const assistantMsg: ChatMessage = {
        id: makeId(),
        role: 'assistant',
        content: fullText,
        isHidden: isPlanJson(fullText),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingText('');

      const parsed = tryParseTrackingPlan(fullText);
      if (parsed) {
        const dupes = findDuplicates(parsed);
        const lengthViolations = findLengthViolations(parsed);
        const existingMatches = checkAgainstExistingEvents(parsed);

        if (dupes.length > 0 || lengthViolations.length > 0 || existingMatches.length > 0) {
          const warnParts: string[] = [];
          const fixParts: string[] = [];

          if (dupes.length > 0) {
            const dupeList = dupes.map((d) => `• ${d.key} (${d.count} раза)`).join('\n');
            warnParts.push(`Дубликаты (event_category + event_label + event_name):\n${dupeList}`);
            fixParts.push(`Дубликаты — комбинация event_category + event_label + event_name не уникальна:\n${dupeList}\nИсправь: уточни event_label для различения похожих элементов (например: ArrowBack / ArrowForward, ButtonPrimary / ButtonSecondary).`);
          }

          if (lengthViolations.length > 0) {
            const violList = lengthViolations
              .map((v) => `• ${v.action} + ${v.object} + ${v.object_description} = ${v.total} символов`)
              .join('\n');
            warnParts.push(`Превышение лимита 100 символов (Действие + Объект + Описание объекта):\n${violList}`);
            fixParts.push(`Превышение лимита 100 символов (action + object + object_description):\n${violList}\nИсправь: сократи поле object_description для каждого из этих событий.`);
          }

          if (existingMatches.length > 0) {
            const matchList = existingMatches.map((m) => `• ${m.key}`).join('\n');
            warnParts.push(`Совпадения с базой событий (category + label + name уже существуют):\n${matchList}`);
            fixParts.push(`Следующие комбинации event_category + event_label + event_name уже существуют в базе событий приложения:\n${matchList}\nИзмени event_label (если не получается — event_name) для каждого из этих событий, чтобы комбинация стала уникальной. Верни ПОЛНЫЙ обновлённый JSON.`);
          }

          const warnMsg: ChatMessage = {
            id: makeId(),
            role: 'assistant',
            content: `Найдены проблемы:\n\n${warnParts.join('\n\n')}\n\nФайлы не будут сгенерированы до устранения. Отправляю запрос на исправление…`,
            isWarning: true,
          };
          const correctionMsg: ChatMessage = {
            id: makeId(),
            role: 'user',
            content: `В трекинг-плане обнаружены проблемы:\n\n${fixParts.join('\n\n')}\n\nПовтори генерацию полного JSON с исправлениями.`,
          };
          setMessages((prev) => [...prev, warnMsg, correctionMsg]);
          await fetchAssistantReply([...history, assistantMsg, correctionMsg]);
        } else {
          setPlan(parsed);
          setPlanBuilding(false);
        }
      } else {
        // Response wasn't a plan (normal dialogue) or couldn't be parsed
        setPlanBuilding(false);
      }
    } catch (err) {
      const errText = err instanceof Error ? err.message : String(err);
      const isTerminated = errText.toLowerCase().includes('terminated') || errText.toLowerCase().includes('aborted');

      if (isTerminated && !isRetry) {
        const retryNotice: ChatMessage = {
          id: makeId(),
          role: 'assistant',
          content: 'Соединение прервано, повторяем без изображений…',
          isWarning: true,
        };
        setMessages((prev) => [...prev, retryNotice]);
        setStreamingText('');
        setPlanBuilding(false);
        setLoading(false);
        await fetchAssistantReply(stripImagesFromMessages(history), true);
        return;
      }

      const errMsg: ChatMessage = {
        id: makeId(),
        role: 'assistant',
        content: `Ошибка: ${errText}`,
      };
      setMessages((prev) => [...prev, errMsg]);
      setStreamingText('');
      setPlanBuilding(false);
    } finally {
      setLoading(false);
    }
  };

  // Determine edit position
  const editingIdx = editingId !== null ? messages.findIndex((m) => m.id === editingId) : -1;
  const isEditing = editingId !== null && editingIdx >= 0;

  // Messages shown BEFORE the edit point (or all messages when not editing)
  // Using slice() makes the "before / editing / after" split explicit and unambiguous
  const beforeMessages: ChatMessage[] = isEditing
    ? messages.slice(0, editingIdx).filter((m) => !m.isHidden)
    : messages.filter((m) => !m.isHidden);
  const editingMessage: ChatMessage | null = isEditing ? (messages[editingIdx] ?? null) : null;

  // Option buttons — parsed from the last visible assistant message
  const lastAssistantMsg = !loading
    ? [...beforeMessages].reverse().find((m) => m.role === 'assistant')
    : undefined;
  const options = lastAssistantMsg && !isEditing ? extractOptions(lastAssistantMsg.content) : [];

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isEmpty && !source && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
            <div className="text-5xl mb-4">📱</div>
            <p className="text-lg font-medium text-gray-500">Загрузите скриншот или вставьте URL</p>
            <p className="text-sm mt-1">Claude проанализирует экран и задаст уточняющие вопросы</p>
          </div>
        )}

        {isEmpty && source && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-base font-medium text-gray-600 mb-1">
              {source.type === 'image'
                ? source.images.length === 1
                  ? source.images[0].name
                  : `${source.images.length} файлов готовы к анализу`
                : source.url}
            </p>
            <p className="text-sm text-gray-400 mb-5">Нажмите кнопку, чтобы начать анализ</p>
            <button
              onClick={() => triggerAnalysis(source)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Анализировать
            </button>
          </div>
        )}

        {/* Messages before the edit point (or all messages when not editing) */}
        {beforeMessages.map((msg) => {
          const displayContent =
            msg.role === 'assistant' ? stripOptions(msg.content) : msg.content;
          return (
            <MessageBubble
              key={msg.id}
              message={{ ...msg, content: displayContent }}
              onEdit={msg.role === 'user' ? () => startEdit(msg) : undefined}
            />
          );
        })}

        {/* Inline editor for the editing message */}
        {editingMessage && (
          <div key={editingMessage.id} className="flex justify-end mb-3">
            <div className="w-full max-w-[80%]">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    saveEdit();
                  }
                  if (e.key === 'Escape') cancelEdit();
                }}
                className="w-full border-2 border-blue-400 rounded-2xl rounded-br-sm px-4 py-3 text-sm text-gray-800 resize-none focus:outline-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 mt-1.5 justify-end">
                <button
                  onClick={cancelEdit}
                  className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={saveEdit}
                  disabled={!editText.trim() || loading}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Streaming text — never shown when building the plan */}
        {streamingText && !planBuilding && (
          <MessageBubble
            message={{
              id: 'streaming',
              role: 'assistant',
              content: stripOptions(streamingText),
            }}
          />
        )}

        {/* Plan-generation / update loader — replaces JSON stream; hides once plan is ready */}
        {planBuilding && (
          <div className="flex justify-start mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm mr-2 mt-1 shrink-0">
              AI
            </div>
            <div className="bg-white border border-blue-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {plan ? 'Обновляем трекинг-план...' : 'Собираем трекинг-план. Это займёт немного времени'} ⏳
                </span>
                <div className="flex gap-1 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Typing indicator — shown while waiting for any non-plan response */}
        {loading && !streamingText && !planBuilding && (
          <div className="flex justify-start mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm mr-2 mt-1 shrink-0">
              AI
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                {source?.type === 'image' && messages.length <= 1 && (
                  <span className="text-sm text-gray-500">
                    {source.images.length === 1 ? 'Анализирую экран...' : 'Анализирую экраны...'}
                  </span>
                )}
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {!planBuilding && plan && <DownloadPanel plan={plan} />}
        {!planBuilding && plan && <EditChat plan={plan} onPlanUpdate={setPlan} />}

        <div ref={bottomRef} />
      </div>

      {/* Clickable option buttons */}
      {options.length > 0 && (
        <div className="px-4 pb-2 pt-2 flex flex-wrap gap-2 border-t border-gray-100 bg-gray-50">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => sendUserMessage(opt)}
              className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 text-sm rounded-full hover:bg-blue-50 hover:border-blue-500 transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendUserMessage()}
            disabled={loading || !source || !!editingId}
            placeholder={
              editingId
                ? 'Редактирование сообщения...'
                : source
                ? 'Ответьте на вопрос модели...'
                : 'Сначала загрузите скриншот или URL'
            }
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <button
            onClick={() => sendUserMessage()}
            disabled={loading || !input.trim() || !source || !!editingId}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}
