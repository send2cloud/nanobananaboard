import { IAIProvider } from './interfaces';
import { GenerationConfig, AppSettings, Provider } from '../../types';

export class ExternalProvider implements IAIProvider {
  private baseUrl: string;
  private isCustom: boolean;

  constructor(isCustom: boolean) {
    this.isCustom = isCustom;
    this.baseUrl = isCustom ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1';
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

  private getEndpoint(path: string): string {
      let cleanBase = this.baseUrl.trim().replace(/\/+$/, "");
      return `${cleanBase}${path}`;
  }

  private async fetchExternal(endpoint: string, body: any, apiKey: string) {
      const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
      };

      if (this.isCustom) {
          headers['HTTP-Referer'] = window.location.origin;
          headers['X-Title'] = 'Nano Banana Storyboarder';
      }

      const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        let errorMessage = `API Error ${response.status}`;
        try {
            if (responseText) {
                const errorData = JSON.parse(responseText);
                const detailedMsg = errorData.error?.message || errorData.message || JSON.stringify(errorData);
                if (detailedMsg) errorMessage += `: ${detailedMsg}`;
            }
        } catch (e) {
            errorMessage += `: ${responseText.slice(0, 100)}`;
        }
        throw new Error(errorMessage);
      }

      try {
          return JSON.parse(responseText);
      } catch (e) {
          throw new Error("Failed to parse JSON response");
      }
  }

  async generateImage(config: GenerationConfig, settings: AppSettings): Promise<string> {
    const apiKey = settings.apiKey;
    if (!apiKey) throw new Error("API Key is missing for external provider.");

    const fullPrompt = this.constructDetailedPrompt(config);
    const model = settings.imageModel || (this.isCustom ? 'google/gemini-3-pro-image-preview' : 'dall-e-3');

    // Decide if Chat Completion or Image Generation Endpoint
    // OpenRouter uses chat completions for Gemini models
    const isChat = this.isCustom || model.includes('gemini') || model.includes('chat');
    
    if (isChat) {
        const endpoint = this.getEndpoint('/chat/completions');
        const body: any = {
            model,
            messages: [{ role: "user", content: fullPrompt }]
        };
        
        if (this.isCustom) {
            body.modalities = ['image', 'text'];
        }

        const data = await this.fetchExternal(endpoint, body, apiKey);
        
        // Parse Chat Response
        const message = data.choices?.[0]?.message;
        if (!message) throw new Error("No content in chat response");

        if (message.images && message.images.length > 0) {
             return message.images[0].url || message.images[0].image_url?.url;
        }
        
        // Fallback markdown parse
        const content = message.content || "";
        const mdMatch = content.match(/!\[.*?\]\((.*?)\)/);
        if (mdMatch && mdMatch[1]) return mdMatch[1];
        
        const urlMatch = content.match(/https?:\/\/[^\s)]+/);
        if (urlMatch) return urlMatch[0];

        throw new Error("No image found in chat response.");

    } else {
        // Standard OpenAI Image Endpoint
        const endpoint = this.getEndpoint('/images/generations');
        const sizeMap: Record<string, string> = {
            '1:1': '1024x1024',
            '16:9': '1792x1024',
            '9:16': '1024x1792',
            '4:3': '1024x1024',
            '3:4': '1024x1024',
        };
        const body = {
            model,
            prompt: fullPrompt,
            n: 1,
            size: sizeMap[config.aspectRatio] || "1024x1024",
            response_format: "b64_json"
        };
        const data = await this.fetchExternal(endpoint, body, apiKey);
        return `data:image/png;base64,${data.data[0].b64_json}`;
    }
  }

  async generateVariation(inputImage: string, prompt: string, model: string, settings: AppSettings): Promise<string> {
      // External variation via Chat Completion (Multimodal)
      const apiKey = settings.apiKey;
      if (!apiKey) throw new Error("API Key missing");
      
      const endpoint = this.getEndpoint('/chat/completions');
      const body: any = {
          model,
          messages: [
              { 
                  role: "user", 
                  content: [
                      { type: "text", text: prompt },
                      { type: "image_url", image_url: { url: inputImage } }
                  ] 
              }
          ]
      };
      
      if (this.isCustom) {
           body.modalities = ['image', 'text'];
      }

      const data = await this.fetchExternal(endpoint, body, apiKey);
      const message = data.choices?.[0]?.message;
      if (message?.images?.length > 0) return message.images[0].url;
      
      // Fallback
      const content = message?.content || "";
      const mdMatch = content.match(/!\[.*?\]\((.*?)\)/);
      if (mdMatch) return mdMatch[1];

      throw new Error("No variation image generated.");
  }

  async generateText(prompt: string, systemInstruction: string, settings: AppSettings): Promise<string> {
      const apiKey = settings.apiKey;
      if (!apiKey) throw new Error("API Key missing");
      
      const model = settings.textModel || 'google/gemini-2.5-flash';
      const endpoint = this.getEndpoint('/chat/completions');

      const body = {
          model,
          messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: prompt }
          ]
      };

      const data = await this.fetchExternal(endpoint, body, apiKey);
      return data.choices?.[0]?.message?.content || '';
  }
}