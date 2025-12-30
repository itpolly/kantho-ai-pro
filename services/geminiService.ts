
import { GoogleGenAI, Modality, Type, GenerateContentResponse } from '@google/genai';
import { VoiceName, VoiceConfigState, VoiceAnalysisResult } from '../types';
import { getSettings, getEffectiveApiKey } from '../utils/storageUtils';

const getClient = () => {
  const apiKey = getEffectiveApiKey();
  if (!apiKey) {
    throw new Error('API Key is missing. Please configure it in Settings.');
  }
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
      
      // Analyze Error for Rate Limits
      // The error object structure from @google/genai or fetch might vary
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
      
      // If not retryable or retries exhausted, throw
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
  
  // Standardized speaker labels for the API mapping
  const SPEAKER_1_LABEL = 'Speaker 1';
  const SPEAKER_2_LABEL = 'Speaker 2';

  // Configuration for Multi-Speaker
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
    // Configuration for Single Speaker
    speechConfig = {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: voiceConfig.primaryVoice,
        },
      },
    };
  }

  // --- Advanced Prompt Engineering for Studio Quality ---
  
  const productionRules = `
### AUDIO PRODUCTION STANDARDS:
1. **Studio Fidelity**: Simulate a professional, sound-treated studio environment. Clear articulation, no background noise.
2. **Dynamic Acting**: Do not strictly "read" the script. Perform it. Use natural intonation, pauses, and emphasis based on the context.
3. **Bengali Phonetics**: Pay close attention to the inherent vowel 'O' (অ) vs 'O' (ও) pronunciation in Bengali words to sound natural. Handle conjuncts (Juktakkhor) with native precision.
`;

  const modeSpecificRules = voiceConfig.mode === 'multi' 
    ? `
### MULTI-SPEAKER PROTOCOL:
- **Strict Role Assignment**: 
  - Text starting with "${SPEAKER_1_LABEL}:" -> MUST be spoken by the Primary Voice.
  - Text starting with "${SPEAKER_2_LABEL}:" -> MUST be spoken by the Secondary Voice.
- **Seamless Flow**: Create a natural conversational rhythm.
- **Invisible Metadata**: NEVER read the labels "${SPEAKER_1_LABEL}" or "${SPEAKER_2_LABEL}" out loud.
` 
    : `
### SINGLE-SPEAKER PROTOCOL:
- **Consistency**: Maintain the defined persona throughout the entire text.
- **Engagement**: Use pacing variations to keep the listener engaged.
`;

  const directorNotes = `
### DIRECTOR'S INSTRUCTIONS (HIGHEST PRIORITY):
1. **Pacing**: The speech speed MUST be **${voiceConfig.pacing}**.
   - If 'Very Slow', speak heavily and deliberately with long pauses (ideal for poetry/drama).
   - If 'Slow', speak calmly with moderate pauses.
   - If 'Natural', speak at a conversational 150 wpm rate.
   - If 'Fast', speak briskly (news/ads style).
   - If 'Rapid', speak very quickly with urgency.
2. **Tone & Emotion**: The speaker MUST perform with a **${voiceConfig.emotion}** tone.
   - Infuse the voice with this specific emotion throughout the entire segment.
   - For 'Whispering', lower the volume and add breathiness.
   - For 'Angry' or 'Fearful', adjust pitch and intensity accordingly.
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

  // Wrap in retry logic
  // Cast to Promise<any> to avoid 'unknown' type errors in consumers (App.tsx, VoiceCloner.tsx) 
  // regarding async iteration, as the stream type is complex/dynamic.
  return withRetry(() => ai.models.generateContentStream({
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
  })) as Promise<any>;
};

export const analyzeReferenceAudio = async (audioBase64: string, mimeType: string): Promise<VoiceAnalysisResult> => {
  const ai = getClient();
  const settings = getSettings();
  const model = settings.models.script || 'gemini-2.0-flash'; // Fallback to script model logic for analysis

  const prompt = `
You are an expert Voice Director. Analyze the attached audio sample to create a "Voice Clone" configuration for a Text-to-Speech system.

Your Goal:
1. Identify the gender, pitch, pacing, and emotional tone.
2. Select the BEST MATCH from: 'Charon', 'Fenrir', 'Puck', 'Kore', 'Zephyr'.
3. Write a precise "System Instruction" for the TTS model.

Return JSON ONLY in this format:
{
  "baseVoice": "VoiceName",
  "instruction": "Detailed system instruction string...",
  "description": "Short description of the voice"
}
`;

  // Wrap in retry logic and cast response
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

  const text = response.text;
  if (!text) throw new Error("Failed to analyze audio");

  try {
    const result = JSON.parse(text);
    return result as VoiceAnalysisResult;
  } catch (e) {
    console.error("Failed to parse voice analysis", text);
    throw new Error("Invalid response from voice analyzer");
  }
};

export interface ScriptGenerationOptions {
  isMultiSpeaker?: boolean;
  presetName?: string;
  presetInstruction?: string;
  image?: {
    data: string; // base64
    mimeType: string;
  };
}

/**
 * Generates a professional voice-over script from a topic, URL, OR Image.
 */
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
  
  const styleContext = options?.presetInstruction 
    ? options.presetInstruction.substring(0, 800) 
    : 'Professional, engaging, and suitable for broadcast.';

  let formattingRules = '';
  
  if (isMulti) {
    formattingRules = `
    - **Structure**: Create a script with alternating turns between two speakers.
    - **Labels (STRICT)**: You MUST start every spoken turn with EXACTLY "Speaker 1:" or "Speaker 2:". 
    - **Separation**: Ensure there is a newline between turns.
    `;
  } else {
    formattingRules = `
    - **Structure**: Write a continuous narrative or monologue.
    - **Labels**: Do NOT use any speaker labels. Just write the text.
    `;
  }

  const systemInstruction = `
Role: You are the Lead Scriptwriter for 'Kontho-AI', a premium Bengali Voice-Over studio.
Task: Write a concise, professional Bengali voice-over script based on the user's request.

--- CONFIGURATION ---
Target Mode: ${modeLabel}
Target Persona: ${personaLabel}
Style Guide: "${styleContext}"

--- RULES ---
1. **Language**: Standard Bengali (Shuddho Bangla). MUST BE BENGALI SCRIPT.
2. **Formatting**:
${formattingRules}
3. **Punctuation**: Use correct punctuation.
4. **Length**: Approx 100-150 words.
5. **Greeting**: Always start scripts with 'Assalamu Alaikum' (আসসালামু আলাইকুম) or proper Islamic greetings where appropriate for the context.

Output ONLY the raw script text in Bengali.
`;

  let prompt = "";
  const parts: any[] = [];
  let tools: any[] = [];

  if (type === 'url') {
    prompt = `SOURCE URL: ${input}\n\nACTION: Read the website content and write a ${modeLabel} script summarizing it in Bengali.`;
    tools = [{ googleSearch: {} }];
    parts.push({ text: prompt });
  } else if (type === 'image' && options?.image) {
    prompt = `IMAGE CONTEXT: ${input || "Analyze this image."}\n\nACTION: Write a creative ${modeLabel} script describing or inspired by this image in Bengali.`;
    parts.push({ text: prompt });
    parts.push({
      inlineData: {
        mimeType: options.image.mimeType,
        data: options.image.data
      }
    });
  } else {
    prompt = `TOPIC: "${input}"\n\nACTION: Write a creative ${modeLabel} script about this topic in Bengali.`;
    parts.push({ text: prompt });
  }

  try {
    // Wrap in retry logic and cast response
    const response = await withRetry(() => ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: parts }],
      config: {
        systemInstruction,
        tools,
      },
    })) as GenerateContentResponse;

    return response.text || "দুঃখিত, এই মুহূর্তে স্ক্রিপ্ট তৈরি করা যাচ্ছে না।";
  } catch (error) {
    console.error("Script generation error:", error);
    throw error;
  }
};
