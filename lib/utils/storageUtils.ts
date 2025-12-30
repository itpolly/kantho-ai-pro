

import { AppSettings } from '../types.js'; // Added .js extension

const SETTINGS_KEY = 'kontho_global_settings';

// Define model options for dropdowns
export const TTS_MODEL_OPTIONS = [
  { value: 'gemini-2.5-flash-preview-tts', label: 'Gemini 2.5 Flash TTS (Recommended)' },
  { value: 'gemini-2.5-flash-tts', label: 'Gemini 2.5 Flash TTS (Stable)' },
  { value: 'custom', label: 'Custom Model ID...' },
];

export const SCRIPT_MODEL_OPTIONS = [
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview (Recommended)' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Legacy)' },
  { value: 'custom', label: 'Custom Model ID...' },
];

export const LIVE_MODEL_OPTIONS = [
  { value: 'gemini-2.5-flash-native-audio-preview-09-2025', label: 'Gemini 2.5 Flash Native Audio (Recommended)' },
  { value: 'custom', label: 'Custom Model ID...' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  models: {
    tts: 'gemini-2.5-flash-preview-tts',
    script: 'gemini-3-flash-preview',
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
  // As per guidelines, API key must exclusively come from process.env.API_KEY
  // The app should not ask the user for it.
  return process.env.API_KEY || '';
};