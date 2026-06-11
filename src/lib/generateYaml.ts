import JSZip from 'jszip';
import yaml from 'js-yaml';
import type { TrackingEvent, TrackingPlan } from './types';

const TRANSLITERATION_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
  з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
  я: 'ya',
  ' ': '_', '-': '_', '«': '', '»': '', '"': '', "'": '', '.': '',
  ',': '', '(': '', ')': '', '/': '_', '\\': '_', ':': '', '=>': '',
};

function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((ch) => TRANSLITERATION_MAP[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function makeEventKey(event: TrackingEvent): string {
  const appSlug = transliterate(event.app);
  const categoryParts = event.category_functional.split('=>').map((s) => transliterate(s.trim()));
  const categorySlug = categoryParts[0];
  const screenSlug = categoryParts[1] ?? categoryParts[0];
  const actionSlug = transliterate(event.action);
  const objectSlug = transliterate(event.object);
  const descSlug = transliterate(event.object_description);
  return `${appSlug}::${categorySlug}::${screenSlug}::${actionSlug}_${objectSlug}_${descSlug}`;
}

function makeFileName(event: TrackingEvent): string {
  const action = event.action.replace(/[<>:"/\\|?*]/g, '');
  const object = event.object.replace(/[<>:"/\\|?*]/g, '');
  const desc = event.object_description.replace(/[<>:"/\\|?*]/g, '');
  return `${action} - ${object} - ${desc}.yaml`;
}

function buildOpentp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function eventToYamlObject(event: TrackingEvent): object {
  const schema: Record<string, unknown> = {
    application_id: { value: event.application_id },
    event_category: { value: event.event_category },
    event_label: { value: event.event_label },
    event_name: { value: event.event_name },
  };

  if (event.dimensions && event.dimensions.length > 0) {
    event.dimensions.forEach((dim) => {
      schema[`dimension_${dim.dimension_n}`] = {
        title: dim.alfa_metric_name,
        type: 'string',
        required: true,
      };
    });
  }

  return {
    opentp: buildOpentp(),
    event: {
      key: makeEventKey(event),
      lifecycle: { status: 'active' },
      taxonomy: {
        trigger: event.trigger,
        team: event.team_key,
        ametricaId: null,
      },
      payload: {
        all: {
          current: '1.0.0',
          '1.0.0': {
            meta: { changes: [] },
            schema,
          },
        },
      },
    },
  };
}

export async function generateYamlZip(plan: TrackingPlan): Promise<void> {
  const zip = new JSZip();

  plan.events.forEach((event) => {
    const obj = eventToYamlObject(event);
    const yamlStr = yaml.dump(obj, { lineWidth: -1, indent: 2, quotingType: '"' });
    const fileName = makeFileName(event);
    zip.file(fileName, yamlStr);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tracking-plan-yaml.zip';
  a.click();
  URL.revokeObjectURL(url);
}
