import { GoogleGenAI } from "@google/genai";
import { MODEL_OPTIONS, GenerationConfig, AppSettings, Provider } from '../types';

const getAiClient = (apiKey?: string) => {
  return new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
};

const constructDetailedPrompt = (config: GenerationConfig): string => {
  const parts = [
    config.prompt,
    config.style ? `Artistic Style: ${config.style}` : '',
    config.shotType ? `Shot Type: ${config.shotType}` : '',
    config.cameraAngle ? `Camera Angle: ${config.cameraAngle}` : '',
    config.lighting ? `Lighting: ${config.lighting}` : '',
  ].filter(Boolean);
  
  return parts.join(', ');
};

// --- Google Provider Implementation ---
const generateWithGoogle = async (config: GenerationConfig, modelOverride?: string, apiKey?: string) => {
  const ai = getAiClient(apiKey);
  const fullPrompt = constructDetailedPrompt(config);
  
  const requestConfig: any = {
      imageConfig: {
          aspectRatio: config.aspectRatio,
      }
  };
  
  const modelToUse = modelOverride || config.model;

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
};

// --- External Provider Helper (Supports Text-to-Image and Image-to-Image) ---
const generateWithExternal = async (
  config: GenerationConfig | { prompt: string }, // Can be full config or simple object
  apiKey: string, 
  baseUrl: string, 
  model: string,
  inputImage?: string // Optional base64/url for variations
) => {
  if (!apiKey) throw new Error("API Key is missing. Please add it in Settings.");

  const fullPrompt = 'aspectRatio' in config 
    ? constructDetailedPrompt(config as GenerationConfig) 
    : config.prompt;

  const cleanUrl = baseUrl.replace(/\/$/, "");
  
  // Detect if we should use Chat Completions (e.g. OpenRouter) or Image Generation
  const isChatEndpoint = cleanUrl.includes('chat/completions');

  let body: any;
  
  if (isChatEndpoint) {
    // Construct Chat Completion Payload for providers like OpenRouter/Gemini
    
    let messagesContent: any = fullPrompt;

    // Handle Multimodal Input (Image + Text) for Variations
    if (inputImage) {
        messagesContent = [
            {
                type: "text",
                text: fullPrompt
            },
            {
                type: "image_url",
                image_url: {
                    url: inputImage // Works with data:image... or http://...
                }
            }
        ];
    }

    body = {
      model: model,
      messages: [
        {
          role: "user",
          content: messagesContent
        }
      ],
    };

    // OpenRouter/Gemini specific requirement: Modalities
    // See: https://openrouter.ai/google/gemini-3-pro-image-preview/api
    if (cleanUrl.includes('openrouter') || model.includes('gemini')) {
       body.modalities = ['image', 'text'];
    }

  } else {
    // Construct Standard OpenAI Image Payload (DALL-E 3 does not support image input via this endpoint typically)
    // If inputImage is present, this might fail unless endpoint supports edits/variations standard
    
    if (inputImage) {
         throw new Error("Standard OpenAI Image Generation endpoint does not support image-to-image variations via this method. Use a Chat Completion endpoint (OpenRouter) or Gemini.");
    }

    const sizeMap: Record<string, string> = {
      '1:1': '1024x1024',
      '16:9': '1792x1024',
      '9:16': '1024x1792',
      '4:3': '1024x1024',
      '3:4': '1024x1024',
    };
    
    const aspectRatio = 'aspectRatio' in config ? (config as GenerationConfig).aspectRatio : '1:1';

    body = {
      model: model,
      prompt: fullPrompt,
      n: 1,
      size: sizeMap[aspectRatio] || "1024x1024",
      response_format: "b64_json"
    };
  }

  const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
  };

  // OpenRouter specific headers for better tracking (optional)
  if (cleanUrl.includes('openrouter')) {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'Nano Banana Storyboarder';
  }

  let response;
  try {
      response = await fetch(cleanUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
  } catch (networkError) {
      throw new Error(`Network Request Failed: ${networkError instanceof Error ? networkError.message : String(networkError)}. Check your internet or CORS settings.`);
  }

  // Read body strictly once as text to allow flexible parsing
  const responseText = await response.text();
  
  if (!response.ok) {
    let errorMessage = `API Error ${response.status} (${response.statusText})`;
    try {
        if (responseText) {
            const errorData = JSON.parse(responseText);
            const detailedMsg = errorData.error?.message || errorData.message || JSON.stringify(errorData);
            if (detailedMsg) errorMessage += `: ${detailedMsg}`;
        }
    } catch (parseError) {
        if (responseText) {
            errorMessage += `: ${responseText.slice(0, 150)}...`;
        }
    }
    throw new Error(errorMessage);
  }

  // Parse success response
  let data;
  try {
      data = JSON.parse(responseText);
  } catch (e) {
      throw new Error(`Failed to parse valid JSON from API response. Raw: ${responseText.slice(0, 50)}...`);
  }

  // --- Handle Chat Completion Response (OpenRouter / Markdown Image / URL) ---
  if (isChatEndpoint) {
     const message = data.choices?.[0]?.message;
     if (!message) throw new Error("No content found in chat completion response.");
     
     // 1. Check for OpenRouter specific 'images' array in message
     // Structure: message: { role: 'assistant', content: '', images: [ { image_url: { url: '...' } } ] }
     if (message.images && Array.isArray(message.images) && message.images.length > 0) {
        const imgObj = message.images[0];
        // Handle both standard openai format inside images array or direct url property
        const url = imgObj.image_url?.url || imgObj.url;
        if (url) return url;
     }

     const content = message.content || "";

     // 2. Check for Markdown image: ![alt](url)
     const mdMatch = content.match(/!\[.*?\]\((.*?)\)/);
     if (mdMatch && mdMatch[1]) return mdMatch[1];

     // 3. Check for raw URL (simple heuristic)
     const urlMatch = content.match(/https?:\/\/[^\s)]+/);
     if (urlMatch) return urlMatch[0];

     throw new Error("Could not extract image URL from chat response. No 'images' array and no URL in content.");
  } 
  
  // --- Handle Standard Image Response ---
  else {
      const b64 = data.data?.[0]?.b64_json;
      if (b64) return `data:image/png;base64,${b64}`;

      const url = data.data?.[0]?.url;
      if (url) return url;

      throw new Error("No image data (b64_json or url) found in API response");
  }
};

/**
 * Main Generation Router
 */
export const generateImageFromConfig = async (
  config: GenerationConfig, 
  settings?: AppSettings
): Promise<string> => {
  const provider = settings?.provider || Provider.GOOGLE;

  try {
    switch (provider) {
      case Provider.OPENAI:
        return await generateWithExternal(
          config, 
          settings?.apiKey || '', 
          settings?.baseUrl || 'https://api.openai.com/v1/images/generations', 
          settings?.modelOverride || 'dall-e-3',
          undefined
        );
      
      case Provider.CUSTOM:
        return await generateWithExternal(
          config, 
          settings?.apiKey || '', 
          settings?.baseUrl || 'https://openrouter.ai/api/v1/chat/completions', 
          settings?.modelOverride || 'google/gemini-3-pro-image-preview',
          undefined
        );

      case Provider.GOOGLE:
      default:
        return await generateWithGoogle(config, undefined, settings?.apiKey);
    }
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

/**
 * Generates a variation of an existing image.
 */
export const generateImageVariation = async (
  inputImage: string,
  prompt: string,
  model: string = MODEL_OPTIONS.FLASH,
  settings?: AppSettings
): Promise<string> => {
  
  const provider = settings?.provider || Provider.GOOGLE;

  // 1. Route to External Provider (OpenAI / OpenRouter) if selected
  if (provider === Provider.OPENAI || provider === Provider.CUSTOM) {
     const apiKey = settings?.apiKey || '';
     const baseUrl = settings?.baseUrl || (provider === Provider.OPENAI ? 'https://api.openai.com/v1/images/generations' : 'https://openrouter.ai/api/v1/chat/completions');
     const modelId = settings?.modelOverride || (provider === Provider.OPENAI ? 'dall-e-3' : 'google/gemini-3-pro-image-preview');

     return await generateWithExternal(
         { prompt: `Generate a variation of this image. ${prompt}` },
         apiKey,
         baseUrl,
         modelId,
         inputImage
     );
  }

  // 2. Google Provider (Nano Banana) Implementation
  const ai = getAiClient(settings?.apiKey);

  let mimeType = 'image/png';
  let data = '';

  // Handle Base64 vs URL input
  if (inputImage.startsWith('data:')) {
      const matches = inputImage.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
          mimeType = matches[1];
          data = matches[2];
      }
  } else if (inputImage.startsWith('http')) {
      // It's a URL (from OpenRouter/External). We must fetch it to get bytes for Gemini.
      try {
          const resp = await fetch(inputImage);
          const blob = await resp.blob();
          mimeType = blob.type;
          
          const buffer = await blob.arrayBuffer();
          // Convert buffer to base64
          let binary = '';
          const bytes = new Uint8Array(buffer);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          data = btoa(binary);
      } catch (e) {
          throw new Error("Could not fetch remote image for variation (CORS or Network error): " + e);
      }
  } else {
      // Assume raw base64 or invalid
      data = inputImage.replace(/^data:image\/\w+;base64,/, "");
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data,
            },
          },
          {
            text: `Generate a variation of this image. ${prompt}`,
          },
        ],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
       throw new Error("No content parts in variation response");
    }

    for (const part of parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data found in variation response");
  } catch (error) {
    console.error("Error generating variation:", error);
    throw error;
  }
};