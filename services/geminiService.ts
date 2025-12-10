import { GoogleGenAI } from "@google/genai";
import { MODEL_OPTIONS, GenerationConfig, AppSettings, Provider } from '../types';

const getAiClient = (apiKey?: string) => {
  // If the user provided a key via settings, use it. Otherwise fall back to ENV.
  // Note: Only call this if you INTEND to use the Google SDK.
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

// --- TEXT GENERATION (For Intelligent Suggestions) ---

export const generateText = async (
    prompt: string, 
    systemInstruction: string,
    settings: AppSettings
): Promise<string> => {
    const provider = settings.provider || Provider.GOOGLE;
    const apiKey = settings.apiKey;
    
    const googleTextModel = 'gemini-2.5-flash';
    const externalTextModel = settings.textModel || 'google/gemini-2.5-flash';

    // STRICT CHECK: If user wants Custom/OpenRouter, DO NOT use Google SDK.
    if (provider === Provider.GOOGLE) {
        const ai = getAiClient(apiKey);
        try {
            const response = await ai.models.generateContent({
                model: googleTextModel,
                contents: prompt,
                config: { systemInstruction }
            });
            return response.text || '';
        } catch (e) {
            console.error("Gemini Text Gen Error:", e);
            throw e;
        }
    } else {
        // OpenRouter / OpenAI Text Generation
        // NOTE: We don't have baseUrl in settings anymore, so we default based on provider
        let baseUrl = provider === Provider.OPENAI ? 'https://api.openai.com/v1' : 'https://openrouter.ai/api/v1';
        
        // Robust Normalization
        baseUrl = baseUrl.trim().replace(/\/+$/, "");
        
        let endpoint = baseUrl;
        if (!endpoint.includes('/chat/completions')) {
             endpoint = `${endpoint}/chat/completions`;
        }

        if (!apiKey) {
            throw new Error(`API Key is missing for ${provider}. Please check Settings.`);
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    ...(provider === Provider.CUSTOM ? {
                        'HTTP-Referer': window.location.origin,
                        'X-Title': 'Nano Banana Storyboarder'
                    } : {})
                },
                body: JSON.stringify({
                    model: externalTextModel,
                    messages: [
                        { role: 'system', content: systemInstruction },
                        { role: 'user', content: prompt }
                    ]
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Text Gen Failed: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || '';
        } catch (e) {
            console.error("External Text Gen Error:", e);
            throw e;
        }
    }
};

export const getVariationSuggestions = async (
    parentPrompt: string, 
    category: string, 
    count: number, 
    settings: AppSettings
): Promise<string[]> => {
    const systemPrompt = `You are a creative storyboard assistant. 
    Your task is to generate distinct, creative variations for a shot description based on a specific category.
    Return ONLY a JSON array of strings. Do not include markdown formatting like \`\`\`json.
    Example: ["Low angle looking up", "Top down view", "Dutch angle"]`;

    const userPrompt = `Context: "${parentPrompt}"
    Category: "${category}"
    Generate ${count} specific, distinct, and creative variations for this shot. 
    For "Camera Angles", suggest specific angles (e.g. Over the shoulder, wide shot).
    For "Narrative", suggest plot progressions.
    For "Environment", suggest different settings or weather.
    For "Artistic Style", suggest visual styles.
    
    Make the suggestions intelligent based on the context (e.g. if context has a horse, suggest 'Horse's POV').`;

    try {
        const result = await generateText(userPrompt, systemPrompt, settings);
        const cleanJson = result.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed)) return parsed.slice(0, count);
        return [];
    } catch (e) {
        console.error("Failed to get suggestions:", e);
        return Array(count).fill(`Variation of ${category}`);
    }
};

export const enhancePrompt = async (
    config: GenerationConfig, 
    settings: AppSettings
): Promise<string> => {
    const systemInstruction = `You are an expert prompt engineer for advanced AI image generation models (specifically Gemini 3 Pro).
    Your task is to rewrite the user's input to be highly descriptive, vivid, and cinematic.
    
    Incorporate the following details naturally into the description if they are provided, but do not just list them:
    - Style: ${config.style}
    - Shot Type: ${config.shotType}
    - Camera Angle: ${config.cameraAngle}
    - Lighting: ${config.lighting}

    The goal is to produce a prompt that generates a high-quality, professional image suitable for a storyboard.
    Output ONLY the enhanced prompt text. Do not add explanations or quotes.`;

    const userPrompt = `Original Prompt: ${config.prompt}`;

    try {
        return await generateText(userPrompt, systemInstruction, settings);
    } catch (e) {
        console.error("Failed to enhance prompt:", e);
        return config.prompt; // Fallback to original
    }
};


// --- IMAGE GENERATION ---

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
  config: GenerationConfig | { prompt: string }, 
  apiKey: string, 
  baseUrl: string, 
  model: string,
  inputImage?: string 
) => {
  if (!apiKey) throw new Error("API Key is missing. Please add it in Settings.");

  const fullPrompt = 'aspectRatio' in config 
    ? constructDetailedPrompt(config as GenerationConfig) 
    : config.prompt;

  const cleanUrl = baseUrl.trim().replace(/\/+$/, "");
  
  // Detect if we should use Chat Completions
  const isChatEndpoint = cleanUrl.includes('chat/completions') || cleanUrl.includes('openrouter.ai');

  let body: any;
  let fetchUrl = cleanUrl;
  
  if (isChatEndpoint) {
    if (!fetchUrl.includes('/chat/completions')) {
        fetchUrl = `${fetchUrl}/chat/completions`;
    }

    let messagesContent: any = fullPrompt;

    if (inputImage) {
        messagesContent = [
            { type: "text", text: fullPrompt },
            { type: "image_url", image_url: { url: inputImage } }
        ];
    }

    body = {
      model: model,
      messages: [
        { role: "user", content: messagesContent }
      ],
    };

    if (fetchUrl.includes('openrouter') || model.includes('gemini')) {
       body.modalities = ['image', 'text'];
    }

  } else {
    // Standard OpenAI Image Payload
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

  if (fetchUrl.includes('openrouter')) {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'Nano Banana Storyboarder';
  }

  let response;
  try {
      response = await fetch(fetchUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
  } catch (networkError) {
      throw new Error(`Network Request Failed: ${networkError instanceof Error ? networkError.message : String(networkError)}. Check your internet or CORS settings.`);
  }

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

  let data;
  try {
      data = JSON.parse(responseText);
  } catch (e) {
      throw new Error(`Failed to parse valid JSON from API response. Raw: ${responseText.slice(0, 50)}...`);
  }

  if (isChatEndpoint) {
     const message = data.choices?.[0]?.message;
     if (!message) throw new Error("No content found in chat completion response.");
     
     if (message.images && Array.isArray(message.images) && message.images.length > 0) {
        const imgObj = message.images[0];
        const url = imgObj.image_url?.url || imgObj.url;
        if (url) return url;
     }

     const content = message.content || "";
     const mdMatch = content.match(/!\[.*?\]\((.*?)\)/);
     if (mdMatch && mdMatch[1]) return mdMatch[1];

     const urlMatch = content.match(/https?:\/\/[^\s)]+/);
     if (urlMatch) return urlMatch[0];

     throw new Error("Could not extract image URL from chat response. No 'images' array and no URL in content.");
  } 
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

  // STRICT ROUTING: Ensure we only go to Google if it IS Google
  if (provider === Provider.OPENAI) {
      return await generateWithExternal(
          config, 
          settings?.apiKey || '', 
          'https://api.openai.com/v1/images/generations', 
          settings?.imageModel || 'dall-e-3',
          undefined
      );
  }

  if (provider === Provider.CUSTOM) {
      return await generateWithExternal(
          config, 
          settings?.apiKey || '', 
          'https://openrouter.ai/api/v1', 
          settings?.imageModel || 'google/gemini-3-pro-image-preview',
          undefined
      );
  }

  // Fallback to Google only if provider is Google
  return await generateWithGoogle(config, undefined, settings?.apiKey);
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
     const baseUrl = provider === Provider.OPENAI ? 'https://api.openai.com/v1/images/generations' : 'https://openrouter.ai/api/v1';
     const modelId = settings?.imageModel || (provider === Provider.OPENAI ? 'dall-e-3' : 'google/gemini-3-pro-image-preview');

     return await generateWithExternal(
         { prompt: `Generate a variation of this image. ${prompt}` },
         apiKey,
         baseUrl,
         modelId,
         inputImage
     );
  }

  // 2. Google Provider (Nano Banana) Implementation
  // Note: Only runs if provider IS Google.
  const ai = getAiClient(settings?.apiKey);

  let mimeType = 'image/png';
  let data = '';

  if (inputImage.startsWith('data:')) {
      const matches = inputImage.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
          mimeType = matches[1];
          data = matches[2];
      }
  } else if (inputImage.startsWith('http')) {
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
          throw new Error("Could not fetch remote image for variation (CORS or Network error): " + e);
      }
  } else {
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