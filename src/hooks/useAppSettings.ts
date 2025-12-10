import { useState, useEffect } from 'react';
import { AppSettings, Provider } from '../types';

const STORAGE_KEY = 'nano_banana_settings_v2';

export const useAppSettings = () => {
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const defaultKeys = {
        [Provider.GOOGLE]: '',
        [Provider.OPENAI]: '',
        [Provider.CUSTOM]: ''
    };

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      
      // Attempt to load new V2 settings
      if (stored && stored !== 'undefined' && stored !== 'null') {
        const parsed = JSON.parse(stored);
        // Ensure keys object exists
        if (!parsed.keys) parsed.keys = defaultKeys;
        return parsed;
      }

      // Fallback: Try to migrate old settings
      const oldStored = localStorage.getItem('nano_banana_settings');
      if (oldStored && oldStored !== 'undefined') {
          const oldParsed = JSON.parse(oldStored);
          const initialKeys = { ...defaultKeys };
          
          if (oldParsed.apiKey && oldParsed.provider) {
             initialKeys[oldParsed.provider as Provider] = oldParsed.apiKey;
          }

          return {
              provider: oldParsed.provider || Provider.GOOGLE,
              apiKey: oldParsed.apiKey || '',
              keys: initialKeys,
              baseUrl: oldParsed.baseUrl || '',
              imageModel: oldParsed.imageModel || '',
              textModel: oldParsed.textModel || ''
          };
      }

    } catch (e) {
      console.error("Failed to load settings from storage", e);
    }

    return {
      provider: Provider.GOOGLE,
      apiKey: '',
      keys: defaultKeys,
      baseUrl: '',
      imageModel: '',
      textModel: ''
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