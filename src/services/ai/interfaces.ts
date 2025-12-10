import { GenerationConfig, AppSettings } from '../../types';

export interface IAIProvider {
  generateImage(config: GenerationConfig, settings: AppSettings, inputImage?: string): Promise<string>;
  generateVariation(inputImage: string, prompt: string, model: string, settings: AppSettings): Promise<string>;
  generateText(prompt: string, systemInstruction: string, settings: AppSettings): Promise<string>;
}