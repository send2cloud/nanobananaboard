import { Node } from 'reactflow';

export enum NodeType {
  START = 'start',
  SOURCE = 'source',
  IMAGE = 'image',
  VARIATION = 'variation',
  GRID = 'grid',
  GROUP = 'group',
}

export enum Provider {
  GOOGLE = 'google',
  OPENAI = 'openai',
  CUSTOM = 'custom', // Replaces OPENROUTER to be more generic/accurate
}

export interface AppSettings {
  provider: Provider;
  apiKey: string; // The currently active key
  keys: Record<Provider, string>; // Per-provider key storage
  baseUrl?: string; 
  imageModel?: string; // Replaces modelOverride
  textModel?: string; // New for suggestions
  enableGoogle?: boolean; // Toggle for Google Models
}

export interface GenerationConfig {
  model: string;
  aspectRatio: string;
  style: string;
  shotType?: string;
  cameraAngle?: string;
  lighting?: string;
  prompt: string;
}

export interface ClipboardItem {
  id: string;
  imageUrl: string;
  prompt: string;
  sourceNodeId: string;
}

export interface ImageNodeData {
  imageUrl?: string;
  prompt?: string;
  config?: GenerationConfig;
  loading?: boolean;
  onAddVariation?: (id: string) => void;
  onEdit?: (id: string, prompt: string) => void;
  onAddToClipboard?: (url: string, prompt: string, nodeId: string) => void; 
  generatedBy?: string; 
}

export interface SourceNodeData {
  inputImage?: string;
  onGenerate: (config: GenerationConfig, image?: string) => void;
  onSetInputImage?: (id: string, image: string) => void; // New callback for setting image
  onEnhancePrompt?: (config: GenerationConfig) => Promise<string>;
  loading?: boolean;
  activeProvider?: string;
  provider?: Provider;
  globalModel?: string;
}

export interface VariationNodeData {
  parentId: string;
  parentImage: string;
  parentPrompt: string; // Context for AI suggestions
  onGenerate: (id: string, config: VariationConfig) => void;
  onSuggest: (category: string, count: number, parentPrompt: string) => Promise<string[]>; // AI Suggestion Callback
  loading?: boolean;
}

export interface StartNodeData {
  onGenerate: (config: GenerationConfig, image?: string) => void;
  onEnhancePrompt?: (config: GenerationConfig) => Promise<string>; 
  loading?: boolean;
  activeProvider?: string; 
  provider?: Provider; 
  globalModel?: string; 
}

export interface GridNodeData {
  images: Array<{
    id: string;
    url: string;
    prompt: string;
  }>;
  parentId: string;
  config: VariationConfig;
  onBranch: (imageUrl: string, prompt: string, parentId: string) => void;
}

export interface GroupNodeData {
  label: string;
  width?: number;
  height?: number;
  isCollapsed?: boolean;
  onUngroup?: (id: string) => void;
  onToggleCollapse?: (id: string, collapsed: boolean) => void;
}

export interface VariationConfig {
  category: string;
  prompts: string[]; 
  model: string;
}

export type StoryboardNode = Node<ImageNodeData | VariationNodeData | StartNodeData | GridNodeData | GroupNodeData | SourceNodeData>;

export enum VariationCategory {
  CAMERA = 'Camera Angles',
  NARRATIVE = 'Narrative',
  ENVIRONMENT = 'Environment',
  STYLE = 'Artistic Style',
  CUSTOM = 'Custom',
}

export const MODEL_OPTIONS = {
  FLASH: 'gemini-2.5-flash-image', 
  PRO: 'gemini-3-pro-image-preview', 
};

export const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '4:3', value: '4:3' },
  { label: '3:4', value: '3:4' },
];

export const STYLES = [
  { label: 'Cinematic', value: 'cinematic, photorealistic, high detail' },
  { label: 'Sketch', value: 'pencil sketch, rough lines, monochromatic' },
  { label: 'Anime', value: 'anime style, vibrant colors, cel shaded' },
  { label: '3D Render', value: '3D render, octane render, unreal engine 5' },
  { label: 'Oil Painting', value: 'oil painting, textured, classic art' },
];

export const SHOT_TYPES = [
  'Close-up', 'Medium Shot', 'Wide Shot', 'Extreme Wide Shot', 'Macro'
];

export const CAMERA_ANGLES = [
  'Eye Level', 'Low Angle', 'High Angle', 'Overhead', 'Dutch Angle'
];

export const LIGHTING_OPTS = [
  'Natural Light', 'Studio Lighting', 'Cinematic Lighting', 'Golden Hour', 'Neon Lights'
];