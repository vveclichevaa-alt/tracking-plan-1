export interface Dimension {
  dimension_n: number;
  code_name: string;
  alfa_metric_name: string;
  description: string;
  value_examples: string;
  strict_values: string;
}

export interface TrackingEvent {
  version: string;
  os: string;
  application_id: string;
  event_category: string;
  event_label: string;
  event_name: string;
  trigger: string;
  dimensions: Dimension[];
  device_screen_name: string;
  action: string;
  object: string;
  object_description: string;
  app: string;
  category_functional: string;
  team_key: string;
  feature_portal_link: string;
}

export interface NewDictionaryValues {
  application_id: string[];
  action: string[];
  object: string[];
  app: string[];
  category_functional: string[];
}

export interface TrackingPlan {
  events: TrackingEvent[];
  new_dictionary_values: NewDictionaryValues;
}

export interface ImageFile {
  base64: string;
  mimeType: string;
  name: string;
}

export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  images?: ImageFile[];
  isWarning?: boolean;
  isHidden?: boolean;
}

export type ScreenSource =
  | { type: 'image'; images: ImageFile[] }
  | { type: 'url'; url: string };
