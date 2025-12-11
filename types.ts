import { Node } from 'reactflow'; // Keep only one import
export * from './enums';
import { NodeType, Provider, VariationCategory } from './enums';



export interface AppSettings {
  provider: Provider;
  apiKey: string; // The currently active key
  keys: Record<Provider, string>; // Per-provider key storage
  baseUrl?: string;
  imageModel?: string; // Replaces modelOverride
  textModel?: string; // New for suggestions
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

export interface ImageNodeData {
  imageUrl?: string;
  prompt?: string;
  config?: GenerationConfig;
  loading?: boolean;
  onAddVariation?: (id: string) => void;
  onEdit?: (id: string, prompt: string) => void; // New callback for editing
  generatedBy?: string;
}

export interface VariationNodeData {
  parentId: string;
  parentImage: string;
  parentPrompt: string; // Context for AI suggestions
  onGenerate: (id: string, config: VariationConfig) => void;
  onSuggest: (category: string, count: number, parentPrompt: string) => Promise<string[]>; // AI Suggestion Callback
  loading?: boolean;
  provider?: Provider; // Inherit provider context
  globalModel?: string; // Inherit global model context
}

export interface StartNodeData {
  onGenerate: (config: GenerationConfig, image?: string) => void;
  onEnhancePrompt?: (config: GenerationConfig) => Promise<string>; // New Magic Wand callback
  loading?: boolean;
  activeProvider?: string; // Visual feedback
  provider?: Provider; // Explicit provider enum
  globalModel?: string; // Explicit global model ID
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
  prompts: string[]; // Changed from single prompt to specific prompts
  model: string;
}

export type StoryboardNode = Node<ImageNodeData | VariationNodeData | StartNodeData | GridNodeData | GroupNodeData>;

// VariationCategory is now exported from ./enums


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