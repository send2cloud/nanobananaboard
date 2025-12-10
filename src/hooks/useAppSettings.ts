import { useState, useEffect } from 'react';
import { AppSettings, Provider } from '../types';

const STORAGE_KEY = 'nano_banana_settings_v3'; // Bumped version to force new defaults

export const useAppSettings = () => {
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const defaultKeys = {
        [Provider.GOOGLE]: '',
        [Provider.OPENAI]: '',
        [Provider.CUSTOM]: ''
    };

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      
      if (stored && stored !== 'undefined' && stored !== 'null') {
        const parsed = JSON.parse(stored);
        if (!parsed.keys) parsed.keys = defaultKeys;
        
        // Ensure defaults if fields are missing in migration
        return {
           ...parsed,
           enableGoogle: parsed.enableGoogle ?? false,
        };
      }

      // Legacy migration logic could go here, but sticking to fresh defaults for v3 ensures users see updates
    } catch (e) {
      console.error("Failed to load settings from storage", e);
    }

    // Default Initialization
    return {
      provider: Provider.CUSTOM, // Default to OpenRouter
      apiKey: '',
      keys: defaultKeys,
      baseUrl: '',
      imageModel: 'google/gemini-2.0-flash-001', // Default OpenRouter model
      textModel: 'google/gemini-2.0-flash-001',
      enableGoogle: false // Disabled by default
    };
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsSaving(true);
    const timer = setTimeout(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(appSettings));
            setIsSaving(false);
        } catch (e) {
            console.error("Failed to save settings to local storage", e);
            setIsSaving(false);
        }
    }, 500); 
    return () => clearTimeout(timer);
  }, [appSettings]);

  return { appSettings, setAppSettings, isSaving };
};