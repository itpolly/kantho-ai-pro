
import { AppSettings } from '../types';

const SETTINGS_KEY = 'kontho_global_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '', // Will fall back to process.env in service if empty
  models: {
    tts: 'gemini-2.5-flash-preview-tts',
    script: 'gemini-2.0-flash',
    live: 'gemini-2.5-flash-native-audio-preview-09-2025'
  }
};

export const getSettings = (): AppSettings => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Merge with defaults to ensure all fields exist if schema changes
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        models: { ...DEFAULT_SETTINGS.models, ...parsed.models }
      };
    } catch (e) {
      console.error("Failed to parse settings", e);
    }
  }
  return DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const getEffectiveApiKey = (): string => {
  const settings = getSettings();
  if (settings.apiKey && settings.apiKey.trim() !== '') {
    return settings.apiKey;
  }
  return process.env.API_KEY || '';
};
