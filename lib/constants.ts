

import { PersonaPreset, VoiceName, PacingOption, EmotionOption } from './types.js'; // Added .js extension

export const APP_NAME = "Kontho-AI";
export const APP_TAGLINE = "Premium Bangladeshi Voice-Over Artist";

export const DEFAULT_TEXT = `আসসালামু আলাইকুম। এই গ্রীস্মের ছুটিতে আমরা সুন্দরবন যাওয়ার পরিকল্পনা করছি। সেখানে বাঘ, হরিণ এবং আরও অনেক বন্যপ্রাণী দেখার আশা রাখি। নদীর বুকে নৌকা ভ্রমণ এবং প্রকৃতির নিস্তব্ধতা উপভোগ করার জন্য আমি অধীর আগ্রহে অপেক্ষা করছি।`;

export const KONTHO_SYSTEM_INSTRUCTION = `
Role: You are "Kontho-AI," a premium Bangladeshi Voice-Over Artist. 
Task: Convert input text into professional studio-quality Bengali speech.

Guidelines:
1. Language: Standard Bangladeshi Bengali (Shuddho Bangla).
2. Pronunciation: Perfect articulation of complex compound characters (e.g., ক্ষ, জ্ঞ, ষ্ট).
3. Pacing: Professional speed (approx. 150 words per minute). 
4. Pauses: 0.5s pause for commas, 1.2s pause for full stops (।).
5. No Pre-Amble: Do not say "Sure" or "Here is the audio." Start speaking the input text immediately.
6. Contextual Tone: Maintain a respectful, polite, and culturally appropriate tone.
`.trim();

export const PACING_OPTIONS: { value: PacingOption; label: string }[] = [
  { value: 'Very Slow', label: 'Very Slow (খুব ধীরে)' },
  { value: 'Slow', label: 'Slow (ধীরে)' },
  { value: 'Natural', label: 'Natural (স্বাভাবিক)' },
  { value: 'Fast', label: 'Fast (দ্রুত)' },
  { value: 'Rapid', label: 'Rapid (খুব দ্রুত)' },
];

export const EMOTION_OPTIONS: { value: EmotionOption; label: string }[] = [
  { value: 'Neutral', label: 'Neutral (নিরপেক্ষ)' },
  { value: 'Happy', label: 'Happy (আনন্দিত)' },
  { value: 'Sad', label: 'Sad (বিষাদগ্রস্ত)' },
  { value: 'Excited', label: 'Excited (উত্তেজিত)' },
  { value: 'Authoritative', label: 'Authoritative (কর্তৃত্বপূর্ণ)' },
  { value: 'Soothing', label: 'Soothing (প্রশান্তিদায়ক)' },
  { value: 'Dramatic', label: 'Dramatic (নাটকীয়)' },
  { value: 'Whispering', label: 'Whispering (ফিসফিস)' },
  { value: 'Angry', label: 'Angry (রাগান্বিত)' },
  { value: 'Fearful', label: 'Fearful (ভীত)' },
];

export const DEFAULT_PRESETS: PersonaPreset[] = [
  // --- SINGLE SPEAKER PRESETS ---
  {
    id: 'default_kontho',
    name: 'Kontho-AI (Standard)',
    instruction: KONTHO_SYSTEM_INSTRUCTION,
    sampleText: DEFAULT_TEXT,
    isDefault: true,
    isMultiSpeaker: false,
    defaultPacing: 'Natural',
    defaultEmotion: 'Neutral',
  },
  {
    id: 'news_anchor_bengali',
    name: 'News Anchor (Sangbad Pathak)',
    instruction: `Role: You are a professional Bengali News Anchor (Dhaka TV style).
Task: Read the text with authority, clarity, and neutrality.
Language: Formal Shuddho Bangla.
Pacing: Fast and rhythmic.
Tone: Serious, objective, and urgent.`,
    sampleText: `আসসালামু আলাইকুম, সংবাদে স্বাগত। সাথে আছি আমি। শুরুতেই প্রধান শিরোনাম - আগামী ২৪ ঘণ্টায় সারাদেশে ভারী বৃষ্টিপাতের পূর্বাভাস দিয়েছে আবহাওয়া অধিদপ্তর। এদিকে, পদ্মা সেতুর রক্ষণাবেক্ষণ কাজ আগামীকাল থেকে শুরু হচ্ছে। বিস্তারিত জানাবো একটু পরেই।`,
    isDefault: true,
    isMultiSpeaker: false,
    defaultPacing: 'Fast',
    defaultEmotion: 'Authoritative',
  },
  {
    id: 'audiobook_narrator',
    name: 'Audiobook (Golpo Bola)',
    instruction: `Role: You are a professional Audiobook Narrator.
Task: Read the text with crystal clear pronunciation and an engaging, storytelling tone.
Language: Standard Literary Style.
Pacing: Moderate and rhythmic, perfect for long-form listening.
Tone: Captivating, warm, and polished. Avoid being overly dramatic or too flat.`,
    sampleText: `সকালবেলার রোদ এসে জানালার কাঁচ ছুঁয়ে বিছানায় পড়ল। অনেকদিন পর আজ আকাশের রং এত গাঢ় নীল। রুবিনা জানালার ধারে দাঁড়িয়ে ভাবছিল, জীবনটা সত্যিই অদ্ভুত। কাল যা ছিল চরম সত্য, আজ তা কেবলই স্মৃতি।`,
    isDefault: true,
    isMultiSpeaker: false,
    defaultPacing: 'Natural',
    defaultEmotion: 'Neutral',
  },
  {
    id: 'storyteller_bengali',
    name: 'Storyteller (Dramatized)',
    instruction: `Role: You are an expressive Bengali Storyteller.
Task: Read the text with high emotional range, character voices, and dramatic pauses.
Language: Standard Bengali.
Pacing: Slow and dramatic.
Tone: Warm, engaging, and varying based on the emotion of the text.`,
    sampleText: `অনেক কাল আগের কথা। সুন্দরবনের গভীরে বাস করত এক ধূর্ত শিয়াল। সে নিজেকে বনের রাজা মনে করত। একদিন সে নদীর ধারে জল খেতে গেল। হঠাৎ জল থেকে উঠে এল এক বিশাল কুমির! শিয়াল ভয়ে এক লাফ দিল।`,
    isDefault: true,
    isMultiSpeaker: false,
    defaultPacing: 'Slow',
    defaultEmotion: 'Dramatic',
  },
  {
    id: 'documentary_narrator',
    name: 'Documentary (Prabanney)',
    instruction: `Role: You are a narrator for a nature documentary.
Task: Read the text with a calm, informative, and soothing voice.
Language: Standard Bengali.
Pacing: Relaxed, steady, and observant.
Tone: Educational, soft, and deep.`,
    sampleText: `এই বিশাল হিমালয় পর্বতমালা যেন পৃথিবীর ছাদ। এখানকার বাতাস পাতলা, কিন্তু প্রকৃতি এখানে নিজের খেয়ালে ছবি আঁকে। নিচে বয়ে চলেছে খরস্রোতা নদী, আর উপরে তুষারাবৃত শৃঙ্গ। প্রকৃতির এই রূপ সত্যিই বিস্ময়কর।`,
    isDefault: true,
    isMultiSpeaker: false,
    defaultPacing: 'Slow',
    defaultEmotion: 'Soothing',
  },
  {
    id: 'poetry_recitation',
    name: 'Poetry (Abritti)',
    instruction: `Role: You are a Bengali Abrittishilpi (Recitation Artist).
Task: Recite the text with rhythm, deep emotion, and proper modulation.
Language: Standard Literary Bengali (Sadhu/Cholit mix depending on text).
Pacing: Slow, rhythmic with deliberate pauses for effect.
Tone: Melodic, deep, and artistic.`,
    sampleText: `আমি যদি হতাম বনহংস,
বনহংসী হতে যদি তুমি;
কোনো এক দিগন্তের জলসিড়ি নদীর ধারে
ধানক্ষেতের কাছে
ছিপছিপে শরের ভিতর
নিরালায়...`,
    isDefault: true,
    isMultiSpeaker: false,
    defaultPacing: 'Slow',
    defaultEmotion: 'Dramatic',
  },

  // --- MULTI-SPEAKER PRESETS ---
  {
    id: 'podcast_interview',
    name: '🎙️ Podcast (Sakhkhatkar)',
    instruction: `Role: You are producing a high-end Bengali Podcast episode.
Task: Simulate a lively, intellectual conversation between a Host and a Guest.

Speaker Configuration:
- Speaker 1 (Host): "Charon" (Deep Male, lower vocal register). Tone: Grounded, warm, inquisitive, and steady (The Anchor).
- Speaker 2 (Guest): "Zephyr" (Soft Female, higher vocal register). Tone: Bright, enthusiastic, faster-paced, and expressive (The Expert).

Guidelines:
- **Contrast Strategy**: The Host provides the "Bass" foundation; the Guest provides the "Treble" energy. The contrasting vocal registers enhance clarity and character distinction, crucial for engaging dialogue.
- Overlap feelings of agreement (e.g., "Hmm", "Right") where appropriate for realism.`,
    sampleText: `Speaker 1: আসসালামু আলাইকুম ও সুপ্রিয় শ্রোতা, "ফিউচার টেক" পডকাস্টে আপনাদের স্বাগত! আজ আমাদের স্টুডিওতে আছেন বিশিষ্ট বিজ্ঞানী, ডঃ নুসরাত। কেমন আছেন?

Speaker 2: ওয়ালাইকুম আসসালাম! ধন্যবাদ! আমি চমৎকার আছি। আপনাদের এই সুন্দর আয়োজনে আসতে পেরে আমার খুব ভালো লাগছে।

Speaker 1: আমরা শুনছিলাম আপনি পরিবেশ রক্ষায় নতুন প্রযুক্তি নিয়ে কাজ করছেন। সেটা সম্পর্কে যদি একটু বলতেন?

Speaker 2: অবশ্যই! দেখুন, জলবায়ু পরিবর্তন এখন আমাদের সবচেয়ে বড় চ্যালেঞ্জ। আমার গবেষণা মূলত নবায়নযোগ্য শক্তি বা Renewable Energy কীভাবে আরও সহজলভ্য করা যায়, তা নিয়ে।`,
    isDefault: true,
    isMultiSpeaker: true,
    defaultPacing: 'Natural',
    defaultEmotion: 'Happy',
  },
  {
    id: 'advertisement_promo',
    name: '📢 Commercial (Bigyapon)',
    instruction: `Role: You are recording a high-energy radio commercial.
Task: Perform a punchy dialogue between a Confused Customer and an Energetic Announcer.

Speaker Configuration:
- Speaker 1 (Customer): "Puck" (Young Male, mid-to-high register). Tone: Anxious, fast, slightly higher pitched, struggling with a problem.
- Speaker 2 (Announcer): "Fenrir" (Intense Male, deep, resonant register). Tone: Deep, loud, confident, "Salesy", and solution-oriented.

Guidelines:
- **Contrast Strategy**: Speaker 1 is the "Problem" (Weak/Fast). Speaker 2 is the "Solution" (Strong/Punchy). The sharp contrast between the customer's relatable vulnerability and the announcer's commanding, solution-oriented delivery creates a memorable ad.
- High energy and zero dead air.`,
    isDefault: true,
    isMultiSpeaker: true,
    defaultPacing: 'Fast',
    defaultEmotion: 'Excited',
    sampleText: `Speaker 1: (Anxious) উফ! আমার পুরনো ফোনটা নিয়ে আর পারা যাচ্ছে না। গেম খেললেই হ্যাং করে!

Speaker 2: (Energetic) আর চিন্তা নেই! চলে আসুন "গ্যাজেট ওয়ার্ল্ড"-এ! আমরা নিয়ে এসেছি শহরের সবচেয়ে ফাস্টেস্ট গেমিং ফোন!

Speaker 1: (Surprised) তাই নাকি? কিন্তু পকেটের অবস্থা তো টাইট!

Speaker 2: (Confident) একদম ভাববেন না! ধামাকা অফারে এখন পাচ্ছেন ৪০% ফ্ল্যাট ডিসকাউন্ট! দেরি কিসের? আজই আসুন!`,
  },
  {
    id: 'natika_drama',
    name: '🎭 Audio Drama (Natok)',
    instruction: `Role: You are performing a climax scene from a Bengali Audio Drama (Natika).
Task: Deliver the dialogue with strong cinematic emotion and character acting.

Speaker Configuration:
- Speaker 1 (The Antagonist/Angry): "Fenrir" (Intense Male, powerful low register). Tone: Aggressive, loud, commanding, and rough.
- Speaker 2 (The Protagonist/Calm): "Kore" (Calm Female, gentle mid-register). Tone: Pleading, soft, scared, or trying to de-escalate.

Guidelines:
- **Contrast Strategy**: Extreme emotional distance. One pushes, the other pulls back. This pairing exploits extreme vocal and emotional registers to maximize dramatic tension and character depth.
- Use dramatic pauses and breathiness where appropriate to convey tension.`,
    sampleText: `Speaker 1: (Angry) আমি তোমাকে শেষবারের মতো সাবধান করছি! এই জমির দলিলটা আমাকে দিয়ে দাও, নইলে ফলাফল ভালো হবে না!

Speaker 2: (Scared) দেখুন, দয়া করুন! এটা আমার বাবার শেষ সম্বল। এটা আমি কিছুতেই হাতছাড়া করতে পারব না।

Speaker 1: (Shouting) চুপ করো! আবেগ দেখানোর জায়গা এটা নয়। আমি কালকের মধ্যেই ওই কাগজ চাই!

Speaker 2: (Crying) আপনারা কেন এমন করছেন? আমাদের কি বেঁচে থাকার কোনো অধিকার নেই?`,
    isDefault: true,
    isMultiSpeaker: true,
    defaultPacing: 'Fast',
    defaultEmotion: 'Dramatic',
  }
];

export const VOICE_OPTIONS = [
  { value: VoiceName.Charon, label: 'Charon - Gambhir (Deep Male)', gender: 'Male' },
  { value: VoiceName.Fenrir, label: 'Fenrir - Tejoshwi (Intense Male)', gender: 'Male' },
  { value: VoiceName.Puck, label: 'Puck - Kishore (Clear Male)', gender: 'Male' },
  { value: VoiceName.Kore, label: 'Kore - Shanto (Calm Female)', gender: 'Female' },
  { value: VoiceName.Zephyr, label: 'Zephyr - Komol (Soft Female)', gender: 'Female' },
];