
export enum VoiceName {
  Puck = 'Puck',
  Charon = 'Charon',
  Kore = 'Kore',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
}

export type PacingOption = 'Very Slow' | 'Slow' | 'Natural' | 'Fast' | 'Rapid';
export type EmotionOption = 'Neutral' | 'Happy' | 'Sad' | 'Excited' | 'Authoritative' | 'Soothing' | 'Dramatic' | 'Whispering' | 'Angry' | 'Fearful';

export interface AudioChunk {
  data: Float32Array;
  sampleRate: number;
}

export interface WavConversionOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

export type GenerationStatus = 'idle' | 'generating' | 'playing' | 'completed' | 'error';

export interface PersonaPreset {
  id: string;
  name: string;
  instruction: string;
  sampleText?: string;
  isDefault?: boolean;
  isMultiSpeaker?: boolean;
  baseVoice?: VoiceName; // Used for cloned voices to remember the mapped base voice
  defaultPacing?: PacingOption;
  defaultEmotion?: EmotionOption;
}

export interface VoiceConfigState {
  mode: 'single' | 'multi';
  primaryVoice: VoiceName;
  secondaryVoice: VoiceName;
  pacing: PacingOption;
  emotion: EmotionOption;
}

export interface VoiceAnalysisResult {
  baseVoice: VoiceName;
  instruction: string;
  description: string;
}

export interface AppSettings {
  apiKey: string;
  models: {
    tts: string;
    script: string;
    live: string;
  };
}
