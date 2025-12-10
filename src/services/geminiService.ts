import { GenerationConfig, AppSettings, Provider, MODEL_OPTIONS } from '../types';
import { getProvider } from './ai/Factory';

// Polyfill for process if it's undefined (browser env)
declare const process: any;

// --- Facade Functions for StoryboardFlow ---

export const generateImageFromConfig = async (
  config: GenerationConfig, 
  settings?: AppSettings,
  inputImage?: string 
): Promise<string> => {
    // Default to Google if no settings provided, or if settings exist but no provider set
    const providerType = settings?.provider || Provider.GOOGLE;
    const provider = getProvider(providerType);
    
    // Ensure we have a valid settings object even if undefined passed
    const safeSettings: AppSettings = settings || { 
        provider: Provider.GOOGLE, apiKey: '', keys: {} as any 
    };

    return await provider.generateImage(config, safeSettings, inputImage);
};

export const generateImageVariation = async (
  inputImage: string,
  prompt: string,
  model: string = MODEL_OPTIONS.FLASH,
  settings?: AppSettings
): Promise<string> => {
    const providerType = settings?.provider || Provider.GOOGLE;
    const provider = getProvider(providerType);
    
    const safeSettings: AppSettings = settings || { 
        provider: Provider.GOOGLE, apiKey: '', keys: {} as any 
    };

    // For External, we prefer the imageModel from settings over the passed 'model' arg
    // unless the passed arg is specifically from a parent node that was external
    let finalModel = model;
    if (providerType !== Provider.GOOGLE) {
        finalModel = safeSettings.imageModel || 'google/gemini-3-pro-image-preview';
    }

    return await provider.generateVariation(inputImage, prompt, finalModel, safeSettings);
};

export const editGeneratedImage = async (
    inputImage: string,
    instructions: string,
    model: string,
    settings?: AppSettings
): Promise<string> => {
    return await generateImageVariation(
        inputImage, 
        `Edit this image according to these instructions: ${instructions}`, 
        model, 
        settings
    );
};

export const generateText = async (
    prompt: string, 
    systemInstruction: string,
    settings: AppSettings
): Promise<string> => {
    const provider = getProvider(settings.provider);
    return await provider.generateText(prompt, systemInstruction, settings);
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
        return config.prompt; // Fallback
    }
};