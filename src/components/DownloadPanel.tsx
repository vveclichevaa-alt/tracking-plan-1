import { useState } from 'react';
import type { TrackingPlan } from '../lib/types';
import { generateExcel } from '../lib/generateExcel';
import { generateYamlZip } from '../lib/generateYaml';

interface Props {
  plan: TrackingPlan;
}

export function DownloadPanel({ plan }: Props) {
  const [generatingZip, setGeneratingZip] = useState(false);

  const handleExcel = () => {
    generateExcel(plan);
  };

  const handleYaml = async () => {
    setGeneratingZip(true);
    try {
      await generateYamlZip(plan);
    } finally {
      setGeneratingZip(false);
    }
  };

  const hasNewValues = Object.values(plan.new_dictionary_values).some((arr) => arr.length > 0);

  return (
    <div className="border border-green-200 bg-green-50 rounded-2xl p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-green-600 text-lg">✓</span>
        <h3 className="font-semibold text-green-800">
          Трекинг-план готов — {plan.events.length} {plural(plan.events.length, 'событие', 'события', 'событий')}
        </h3>
      </div>

      {/* Event list */}
      <div className="mb-4 max-h-40 overflow-y-auto">
        {plan.events.map((ev, i) => (
          <div key={i} className="text-xs text-gray-600 py-1 border-b border-green-100 last:border-0">
            <span className="font-mono text-gray-400 mr-2">{i + 1}.</span>
            <span className="text-blue-700 font-medium">{ev.event_category}</span>
            {' · '}
            <span>{ev.event_label}</span>
            {' · '}
            <span className="text-gray-500">{ev.event_name}</span>
          </div>
        ))}
      </div>

      {/* New dictionary values warning */}
      {hasNewValues && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
          <p className="font-semibold text-yellow-800 mb-1">⚠ Новые значения для словаря (выделены красным в Excel):</p>
          {Object.entries(plan.new_dictionary_values).map(([key, values]) =>
            values.length > 0 ? (
              <div key={key} className="text-yellow-700">
                <span className="font-medium">{key}:</span> {values.join(', ')}
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Download buttons */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={handleExcel}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <span>📊</span> Скачать Excel (.xlsx)
        </button>
        <button
          onClick={handleYaml}
          disabled={generatingZip}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <span>📦</span>{' '}
          {generatingZip ? 'Генерация...' : 'Скачать YAML архив (.zip)'}
        </button>
      </div>
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
