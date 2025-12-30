import { GoogleGenAI, Modality, Type, GenerateContentResponse } from '@google/genai';
import { VoiceName, VoiceConfigState, VoiceAnalysisResult } from '../types';
import { getSettings, getEffectiveApiKey } from '../utils/storageUtils';

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
  const model = settings.models.script || 'gemini-3-flash-preview'; // Fallback to script model logic for analysis

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

  // Fix: Access .text as a property, not a method
  const text: string | undefined = response.text;
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
    - **Structure**: Create a natural, engaging dialogue script with clear, alternating turns between two distinct speakers.
    - **Speaker Labels (CRITICAL & STRICT)**: You MUST use ONLY "Speaker 1:" and "Speaker 2:" at the beginning of each turn. DO NOT include any other text, names, descriptions, or parenthetical actions (e.g., "(হাসি)", "(দুঃখ)", "(Anxious)") before or after the speaker label. The label must be followed immediately by the spoken text.
    - **Alternation**: Ensure turns strictly alternate between "Speaker 1:" and "Speaker 2:". Avoid consecutive turns from the same speaker unless explicitly necessary for flow (e.g., a short follow-up or interruption).
    - **Separation**: Each speaker's turn MUST begin on a new line.
    - **Example Format**:
      Speaker 1: কেমন আছেন?
      Speaker 2: আমি ভালো আছি, আপনি কেমন আছেন?
      Speaker 1: আমিও ভালো।
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
Target Persona: "${personaLabel}"
Style Guide: "${styleContext}"

--- RULES (STRICTLY FOLLOWED) ---
1. **Language**: Standard Bengali (Shuddho Bangla). The entire script MUST BE IN BENGALI.
2. **Formatting**:
${formattingRules}
3. **Punctuation**: Use correct Bengali punctuation (e.g., `,`, `।`, `?`, `!`).
4. **Length**: Target approximately 100-150 words. Be concise.
5. **Greeting (MANDATORY)**: Always start the script with 'আসসালামু আলাইকুম' or a proper Bengali/Islamic greeting if the context is appropriate.
6. **Output Purity**: Output ONLY the raw script text in Bengali. DO NOT include any pre-amble, post-amble, conversational filler, or wrap the output in markdown code blocks (e.g., \`\`\`json, \`\`\`text, \`\`\`bengali).

`;

  let userPrompt = "";
  const parts: any[] = [];
  let tools: any[] = [];

  if (type === 'url') {
    userPrompt = `Please visit the URL below, summarize its content, and generate a ${modeLabel} script based on the summary.
URL: ${input}

If the content is not directly in Bengali, translate and summarize it into Bengali. Focus on key information relevant for a voice-over.`;
    tools = [{ googleSearch: {} }];
    parts.push({ text: userPrompt });
  } else if (type === 'image' && options?.image) {
    userPrompt = `Analyze the attached image. ${input.trim() ? `Use the following context for inspiration: "${input.trim()}"` : 'Describe the image content, atmosphere, and any discernible narrative elements.'} Then, write a creative ${modeLabel} script in Bengali inspired by or describing this image.`;
    parts.push({ text: userPrompt });
    parts.push({
      inlineData: {
        mimeType: options.image.mimeType,
        data: options.image.data
      }
    });
  } else { // type === 'topic'
    userPrompt = `Generate a creative ${modeLabel} script about the following topic in Bengali: "${input}".`;
    parts.push({ text: userPrompt });
  }

  try {
    // Wrap in retry logic and cast response
    const response = await withRetry(() => ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: parts }],
      config: {
        systemInstruction,
        tools, // Tools are only active if needed (e.g., googleSearch)
        // Set maxOutputTokens and thinkingBudget to control script length and ensure quality
        maxOutputTokens: 400, // Roughly 200 words, allowing for some buffer
        thinkingConfig: { thinkingBudget: 100 }, // Allocate tokens for model's internal reasoning
      },
    })) as GenerateContentResponse;

    // Fix: Access .text as a property, not a method
    return response.text || "দুঃখিত, এই মুহূর্তে স্ক্রিপ্ট তৈরি করা যাচ্ছে না।";
  } catch (error) {
    console.error("Script generation error:", error);
    throw error;
  }
};