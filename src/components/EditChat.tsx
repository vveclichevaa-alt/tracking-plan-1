import { useEffect, useRef, useState } from 'react';
import {
  checkAgainstExistingEvents,
  findDuplicates,
  findLengthViolations,
  sendMessage,
  tryParseTrackingPlan,
} from '../lib/claude';
import type { TrackingPlan } from '../lib/types';

interface EditEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isWarning?: boolean;
}

interface Props {
  plan: TrackingPlan;
  onPlanUpdate: (plan: TrackingPlan) => void;
}

let editIdCounter = 0;
function makeId() {
  return `edit-${++editIdCounter}`;
}

export function EditChat({ plan, onPlanUpdate }: Props) {
  const [entries, setEntries] = useState<EditEntry[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [planBuilding, setPlanBuilding] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, loading]);

  const applyWithValidation = async (
    contextUserContent: string,
    previousExchanges: Array<{ role: 'user' | 'assistant'; content: string }>,
    isRetry: boolean,
  ): Promise<void> => {
    const apiMessages = [
      { id: 'ctx', role: 'user' as const, content: contextUserContent },
      ...previousExchanges.map((m, i) => ({ id: `px${i}`, role: m.role, content: m.content })),
    ];

    let accumulated = '';
    const fullText = await sendMessage(apiMessages, (chunk) => {
      accumulated += chunk;
      if (accumulated.trimStart().startsWith('{')) {
        setPlanBuilding(true);
        setStreamingText('');
      } else {
        setStreamingText(accumulated);
      }
    });
    setStreamingText('');

    const parsed = tryParseTrackingPlan(fullText);
    if (!parsed) {
      setEntries((prev) => [
        ...prev,
        { id: makeId(), role: 'assistant', content: fullText || 'Не удалось применить правку.' },
      ]);
      return;
    }

    const dupes = findDuplicates(parsed);
    const lengthViolations = findLengthViolations(parsed);
    const existingMatches = checkAgainstExistingEvents(parsed);

    if (dupes.length > 0 || lengthViolations.length > 0 || existingMatches.length > 0) {
      const warnParts: string[] = [];
      const fixParts: string[] = [];

      if (dupes.length > 0) {
        const list = dupes.map((d) => `• ${d.key} (${d.count} раза)`).join('\n');
        warnParts.push(`Дубликаты (event_category + event_label + event_name):\n${list}`);
        fixParts.push(
          `Дубликаты — комбинация event_category + event_label + event_name не уникальна:\n${list}\nИсправь: уточни event_label для различения похожих элементов (например: ArrowBack / ArrowForward).`,
        );
      }
      if (lengthViolations.length > 0) {
        const list = lengthViolations
          .map((v) => `• ${v.action} + ${v.object} + ${v.object_description} = ${v.total} символов`)
          .join('\n');
        warnParts.push(`Превышение лимита 100 символов:\n${list}`);
        fixParts.push(
          `Превышение лимита 100 символов (action + object + object_description):\n${list}\nИсправь: сократи object_description.`,
        );
      }
      if (existingMatches.length > 0) {
        const list = existingMatches.map((m) => `• ${m.key}`).join('\n');
        warnParts.push(`Совпадения с базой событий:\n${list}`);
        fixParts.push(
          `Следующие комбинации уже существуют в базе:\n${list}\nИзмени event_label для каждого из этих событий.`,
        );
      }

      if (!isRetry) {
        setEntries((prev) => [
          ...prev,
          {
            id: makeId(),
            role: 'assistant',
            content: `Найдены проблемы:\n\n${warnParts.join('\n\n')}\n\nОтправляю запрос на исправление…`,
            isWarning: true,
          },
        ]);
        const correctionContent = `В трекинг-плане обнаружены проблемы:\n\n${fixParts.join('\n\n')}\n\nПовтори генерацию полного JSON с исправлениями.`;
        await applyWithValidation(contextUserContent, [
          ...previousExchanges,
          { role: 'assistant', content: fullText },
          { role: 'user', content: correctionContent },
        ], true);
      } else {
        // Second attempt still has issues — show what we got without updating plan
        setEntries((prev) => [
          ...prev,
          {
            id: makeId(),
            role: 'assistant',
            content: `Не удалось устранить все проблемы автоматически:\n\n${warnParts.join('\n\n')}`,
            isWarning: true,
          },
        ]);
      }
      return;
    }

    onPlanUpdate(parsed);
    setEntries((prev) => [
      ...prev,
      { id: makeId(), role: 'assistant', content: `Готово. Трекинг-план обновлён (${parsed.events.length} событий).` },
    ]);
  };

  const submitEdit = async (text?: string) => {
    const editText = (text ?? input).trim();
    if (!editText || loading) return;
    if (!text) setInput('');

    setEntries((prev) => [...prev, { id: makeId(), role: 'user', content: editText }]);
    setLoading(true);
    setPlanBuilding(false);
    setStreamingText('');

    const contextUserContent =
      `Текущий трекинг-план:\n${JSON.stringify(plan, null, 2)}\n\nПравка: ${editText}`;

    try {
      await applyWithValidation(contextUserContent, [], false);
    } catch (err) {
      const errText = err instanceof Error ? err.message : String(err);
      setEntries((prev) => [
        ...prev,
        { id: makeId(), role: 'assistant', content: `Ошибка: ${errText}`, isWarning: true },
      ]);
    } finally {
      setLoading(false);
      setPlanBuilding(false);
      setStreamingText('');
    }
  };

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-2xl p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-blue-600 text-base">✏️</span>
        <h3 className="font-semibold text-blue-800 text-sm">Правки трекинг-плана</h3>
      </div>

      {(entries.length > 0 || (loading && (streamingText || planBuilding))) && (
        <div className="mb-3 max-h-52 overflow-y-auto space-y-2 pr-1">
          {entries.map((entry) => (
            <div key={entry.id} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] text-xs px-3 py-2 rounded-xl whitespace-pre-wrap leading-relaxed ${
                  entry.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : entry.isWarning
                      ? 'bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-bl-sm'
                      : 'bg-white border border-gray-200 text-gray-700 rounded-bl-sm'
                }`}
              >
                {entry.content}
              </div>
            </div>
          ))}

          {loading && streamingText && !planBuilding && (
            <div className="flex justify-start">
              <div className="max-w-[85%] text-xs px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl rounded-bl-sm whitespace-pre-wrap leading-relaxed">
                {streamingText}
              </div>
            </div>
          )}

          {loading && planBuilding && (
            <div className="flex justify-start">
              <div className="text-xs px-3 py-2 bg-white border border-blue-200 text-blue-600 rounded-xl rounded-bl-sm flex items-center gap-2">
                <span>Применяю правку…</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}

          {loading && !streamingText && !planBuilding && (
            <div className="flex justify-start">
              <div className="text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl rounded-bl-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submitEdit()}
          disabled={loading}
          placeholder='Например: "замени Referral на Referral_card в событии 3"'
          className="flex-1 border border-blue-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400 bg-white"
        />
        <button
          onClick={() => submitEdit()}
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap"
        >
          Применить
        </button>
      </div>
    </div>
  );
}
