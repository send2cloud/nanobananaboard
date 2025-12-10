import { GoogleGenAI } from "@google/genai";
import { IAIProvider } from './interfaces';
import { GenerationConfig, AppSettings, MODEL_OPTIONS } from '../../types';

export class GoogleProvider implements IAIProvider {
  private getClient(apiKey?: string) {
    return new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
  }

  private constructDetailedPrompt(config: GenerationConfig): string {
    const parts = [
      config.prompt,
      config.style ? `Artistic Style: ${config.style}` : '',
      config.shotType ? `Shot Type: ${config.shotType}` : '',
      config.cameraAngle ? `Camera Angle: ${config.cameraAngle}` : '',
      config.lighting ? `Lighting: ${config.lighting}` : '',
    ].filter(Boolean);
    return parts.join(', ');
  }

  async generateImage(config: GenerationConfig, settings: AppSettings): Promise<string> {
    const ai = this.getClient(settings.apiKey);
    const fullPrompt = this.constructDetailedPrompt(config);
    
    // Default to Flash if not specified, but StartNode usually specifies.
    const modelToUse = config.model === 'External' ? MODEL_OPTIONS.FLASH : config.model;

    const requestConfig: any = {
        imageConfig: {
            aspectRatio: config.aspectRatio,
        }
    };

    if (modelToUse === MODEL_OPTIONS.PRO) {
       requestConfig.imageConfig.imageSize = "1K";
    }

    try {
        const response = await ai.models.generateContent({
          model: modelToUse,
          contents: {
            parts: [{ text: fullPrompt }],
          },
          config: requestConfig
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (!parts || parts.length === 0) {
          throw new Error("Gemini response contained no content parts.");
        }

        for (const part of parts) {
          if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
        throw new Error("No inline image data found in Gemini response");
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
  }

  async generateVariation(inputImage: string, prompt: string, model: string, settings: AppSettings): Promise<string> {
    const ai = this.getClient(settings.apiKey);
    let mimeType = 'image/png';
    let data = '';

    if (inputImage.startsWith('data:')) {
        const matches = inputImage.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
            mimeType = matches[1];
            data = matches[2];
        }
    } else if (inputImage.startsWith('http')) {
        // Simple fetch for remote images (Google allows URL in some contexts but for variation we usually send bytes)
        // Here we stick to the existing logic of fetching and converting
        try {
            const resp = await fetch(inputImage);
            const blob = await resp.blob();
            mimeType = blob.type;
            const buffer = await blob.arrayBuffer();
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            data = btoa(binary);
        } catch (e) {
            throw new Error("Could not fetch remote image for variation: " + e);
        }
    } else {
        data = inputImage.replace(/^data:image\/\w+;base64,/, "");
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType, data } },
          { text: prompt },
        ],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image data found in variation response");
  }

  async generateText(prompt: string, systemInstruction: string, settings: AppSettings): Promise<string> {
    const ai = this.getClient(settings.apiKey);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction }
        });
        return response.text || '';
    } catch (e) {
        console.error("Gemini Text Gen Error:", e);
        throw e;
    }
  }
}