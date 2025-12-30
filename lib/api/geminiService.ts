import { GoogleGenAI, Modality, Type, GenerateContentResponse } from '@google/genai';
import { VoiceName, VoiceConfigState, VoiceAnalysisResult } from '../types.js';
import { getSettings, getEffectiveApiKey } from '../utils/storageUtils.js';

const getClient = () => {
  const apiKey = getEffectiveApiKey();
  // As per guidelines, process.env.API_KEY is assumed to be pre-configured and valid.
  return new GoogleGenAI({ apiKey });
};

// Helper: Exponential Backoff Retry
async function withRetry<T>(
  operation: () => Promise<T>, 
  maxRetries = 3, 
  baseDelay = 2000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      const status = error?.status || error?.code || error?.error?.code;
      const msg = error?.message || JSON.stringify(error);
      const isRateLimit = 
        status === 429 || 
        msg.includes('429') || 
        msg.toLowerCase().includes('quota') ||
        msg.toLowerCase().includes('resource_exhausted');

      if (isRateLimit && attempt < maxRetries) {
        const jitter = Math.random() * 1000;
        const delay = baseDelay * Math.pow(2, attempt) + jitter;
        console.warn(`[Gemini Service] Rate Limit (429) hit. Retrying in ${Math.round(delay)}ms... (Attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export interface GenerateSpeechParams {
  text: string;
  voiceConfig: VoiceConfigState;
  systemInstruction: string;
}

export const generateSpeechStream = async ({ text, voiceConfig, systemInstruction }: GenerateSpeechParams) => {
  const ai = getClient();
  const settings = getSettings();
  const model = settings.models.tts;

  let speechConfig;
  const SPEAKER_1_LABEL = 'Speaker 1';
  const SPEAKER_2_LABEL = 'Speaker 2';

  if (voiceConfig.mode === 'multi') {
    speechConfig = {
      multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: [
          {
            speaker: SPEAKER_1_LABEL,
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceConfig.primaryVoice,
              },
            },
          },
          {
            speaker: SPEAKER_2_LABEL,
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceConfig.secondaryVoice,
              },
            },
          },
        ],
      },
    };
  } else {
    speechConfig = {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: voiceConfig.primaryVoice,
        },
      },
    };
  }

  const productionRules = `
### AUDIO PRODUCTION STANDARDS:
1. **Studio Fidelity**: Simulate a professional studio environment.
2. **Dynamic Acting**: Perform the script with natural intonation.
3. **Bengali Phonetics**: Precise articulation of complex characters.
`;

  const modeSpecificRules = voiceConfig.mode === 'multi' 
    ? `
### MULTI-SPEAKER PROTOCOL:
- **Strict Role Assignment**: 
  - Text starting with "${SPEAKER_1_LABEL}:" -> MUST be spoken by Primary Voice.
  - Text starting with "${SPEAKER_2_LABEL}:" -> MUST be spoken by Secondary Voice.
- **Seamless Flow**: Create a natural conversational rhythm.
- **Invisible Metadata**: NEVER read the labels "${SPEAKER_1_LABEL}" or "${SPEAKER_2_LABEL}" out loud.
` 
    : `
### SINGLE-SPEAKER PROTOCOL:
- **Consistency**: Maintain defined persona.
- **Engagement**: Use pacing variations.
`;

  const directorNotes = `
### DIRECTOR'S INSTRUCTIONS:
1. **Pacing**: The speech speed MUST be **${voiceConfig.pacing}**.
2. **Tone & Emotion**: The speaker MUST perform with a **${voiceConfig.emotion}** tone.
`;

  const prompt = `
${systemInstruction}

${productionRules}

${directorNotes}

${modeSpecificRules}

---
**SCRIPT TO PERFORM:**
${text}
`;

  return (await withRetry(() => ai.models.generateContentStream({
    model,
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: speechConfig,
    },
  }))) as any;
};

export const analyzeReferenceAudio = async (audioBase64: string, mimeType: string): Promise<VoiceAnalysisResult> => {
  const ai = getClient();
  const settings = getSettings();
  const model = settings.models.script || 'gemini-3-flash-preview';

  const prompt = `
Analyze the attached audio sample. Identify gender, pitch, and tone. Select best match from: 'Charon', 'Fenrir', 'Puck', 'Kore', 'Zephyr'.
Return JSON:
{
  "baseVoice": "VoiceName",
  "instruction": "System instruction...",
  "description": "Voice description"
}
`;

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          }
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
    }
  })) as GenerateContentResponse;

  const responseText = response.text;
  if (!responseText) throw new Error("Failed to analyze audio");

  try {
    return JSON.parse(responseText) as VoiceAnalysisResult;
  } catch (e) {
    throw new Error("Invalid response from voice analyzer");
  }
};

export interface ScriptGenerationOptions {
  isMultiSpeaker?: boolean;
  presetName?: string;
  presetInstruction?: string;
  image?: {
    data: string;
    mimeType: string;
  };
}

export const generateScript = async (
  input: string, 
  type: 'topic' | 'url' | 'image',
  options?: ScriptGenerationOptions
): Promise<string> => {
  const ai = getClient();
  const settings = getSettings();
  const model = settings.models.script;

  const isMulti = options?.isMultiSpeaker ?? false;
  const modeLabel = isMulti ? 'Multi-Speaker Dialogue' : 'Single-Speaker Narration';
  const personaLabel = options?.presetName || 'Standard Professional';
  const styleContext = options?.presetInstruction ? options.presetInstruction.substring(0, 800) : 'Professional.';

  let formattingRules = isMulti 
    ? `- **Speaker Labels**: Use "Speaker 1:" and "Speaker 2:" ONLY.` 
    : `- **Labels**: Do NOT use any speaker labels.`;

  const systemInstruction = `
Role: Lead Scriptwriter for 'Kontho-AI'.
Task: Write professional Bengali voice-over script.
Mode: ${modeLabel}
Persona: ${personaLabel}
Style: ${styleContext}
Rules:
1. Language: Standard Bengali.
2. Formatting: ${formattingRules}
3. Length: 100-150 words.
4. Greeting: Start with 'আসসালামু আলাইকুম'.
`;

  let parts: any[] = [];
  let tools: any[] = [];

  if (type === 'url') {
    parts.push({ text: `Summarize URL: ${input}` });
    tools = [{ googleSearch: {} }];
  } else if (type === 'image' && options?.image) {
    parts.push({ text: `Script based on image. Context: ${input}` });
    parts.push({ inlineData: { mimeType: options.image.mimeType, data: options.image.data } });
  } else {
    parts.push({ text: `Script about topic: ${input}` });
  }

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction,
        tools,
        maxOutputTokens: 400,
        thinkingConfig: { thinkingBudget: 100 },
      },
    })) as GenerateContentResponse;

    return response.text || "দুঃখিত, স্ক্রিপ্ট তৈরি করা সম্ভব হচ্ছে না।";
  } catch (error) {
    console.error("Script generation error:", error);
    throw error;
  }
};