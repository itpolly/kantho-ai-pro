import React, { useState, useCallback, useMemo } from 'react';
import { AlertCircle, X, Activity } from 'lucide-react';
import Header from './components/Header.js'; // Added .js extension
import TextInput from './components/TextInput.js'; // Added .js extension
import ControlPanel from './components/ControlPanel.js'; // Added .js extension
import AudioPlayer from './components/AudioPlayer.js'; // Added .js extension
import LiveInterface from './components/LiveInterface.js'; // Added .js extension
import SettingsModal from './components/SettingsModal.js'; // Added .js extension
import { generateSpeechStream } from './lib/api/geminiService.js'; // Added .js extension
import { DEFAULT_TEXT, KONTHO_SYSTEM_INSTRUCTION, VOICE_OPTIONS } from './lib/constants.js'; // Added .js extension
import { VoiceName, VoiceConfigState, PersonaPreset } from './lib/types.js'; // Added .js extension

const App: React.FC = () => {
  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [instruction, setInstruction] = useState<string>(KONTHO_SYSTEM_INSTRUCTION);
  const [showLiveInterface, setShowLiveInterface] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Voice Configuration State
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfigState>({
    mode: 'single',
    primaryVoice: VOICE_OPTIONS[0].value as VoiceName,   // Default: Charon
    secondaryVoice: VOICE_OPTIONS[4].value as VoiceName, // Default: Zephyr
    pacing: 'Natural',
    emotion: 'Neutral',
  });

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [audioChunks, setAudioChunks] = useState<string[]>([]);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!text.trim()) {
      setErrorMessage("Please enter some text to generate speech.");
      return;
    }
    
    setIsGenerating(true);
    setAudioChunks([]);
    setHasGenerated(false);
    setMimeType(null);
    setErrorMessage(null);

    try {
      const responseStream = await generateSpeechStream({
        text,
        voiceConfig,
        systemInstruction: instruction, 
      });

      let collectedChunks: string[] = [];
      let detectedMimeType: string | null = null;

      for await (const chunk of responseStream) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (parts && parts[0]?.inlineData) {
          const inlineData = parts[0].inlineData;
          if (inlineData.data) {
             collectedChunks.push(inlineData.data);
             if (!detectedMimeType && inlineData.mimeType) {
               detectedMimeType = inlineData.mimeType;
             }
          }
        }
      }
      
      if (collectedChunks.length === 0) {
        throw new Error("The model returned no audio data. The request may have been blocked by safety filters or an internal error.");
      }

      setAudioChunks(collectedChunks);
      setMimeType(detectedMimeType);
      setHasGenerated(true);

    } catch (error: any) {
      console.error('Error generating speech:', error);
      
      let msg = 'An unexpected error occurred. Please try again.';
      const getErrorString = (e: any) => {
        if (typeof e === 'string') return e;
        if (e?.message) return e.message;
        if (e?.error?.message) return e.error.message;
        return JSON.stringify(e);
      };

      const errStr = getErrorString(error).toLowerCase();
      const errCode = error?.status || error?.code || error?.error?.code;

      if (
        errCode === 429 || 
        errStr.includes('429') || 
        errStr.includes('quota') ||
        errStr.includes('resource_exhausted')
      ) {
        msg = '⚠️ Quota Exceeded: The API rate limit has been reached. Please wait a minute before trying again.';
      } else if (errStr.includes('safety')) {
        msg = 'Safety Filter: The generated content was blocked. Please adjust your text or persona.';
      } else if (errCode === 404 || errStr.includes('not_found')) {
        msg = '🌐 Model Not Found / Permissions Error: This typically means the API Key you\'re using does not have access to the selected model, or the GenAI service is not enabled for your project, or billing is not configured. Please check your Google Cloud project settings.';
      } else {
         msg = `Generation Failed: ${getErrorString(error).substring(0, 100)}...`;
      }

      setErrorMessage(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [text, voiceConfig, instruction]); // Dependencies for useCallback

  const handleReset = useCallback(() => {
    setHasGenerated(false);
    setAudioChunks([]);
    setMimeType(null);
    setErrorMessage(null);
  }, []);

  const handlePresetSelected = useCallback((preset: PersonaPreset) => {
    if (preset.isMultiSpeaker) {
      let primary = VoiceName.Charon;
      let secondary = VoiceName.Zephyr;
      switch (preset.id) {
        case 'natika_drama':
          primary = VoiceName.Fenrir; secondary = VoiceName.Kore; break;
        case 'advertisement_promo':
           primary = VoiceName.Puck; secondary = VoiceName.Fenrir; break;
        case 'podcast_interview':
           primary = VoiceName.Charon; secondary = VoiceName.Zephyr; break;
        default: primary = VoiceName.Charon; secondary = VoiceName.Zephyr; // Fallback
      }
      setVoiceConfig(prev => ({
        ...prev,
        mode: 'multi',
        primaryVoice: primary, 
        secondaryVoice: secondary,
        pacing: preset.defaultPacing || 'Natural',
        emotion: preset.defaultEmotion || 'Neutral',
      }));
    } else {
      let primary = VoiceName.Charon;
      if (preset.baseVoice) {
        primary = preset.baseVoice;
      } else {
        switch (preset.id) {
          case 'storyteller_bengali': primary = VoiceName.Charon; break;
          case 'news_anchor_bengali': primary = VoiceName.Kore; break;
          case 'audiobook_narrator': primary = VoiceName.Puck; break;
          case 'poetry_recitation': primary = VoiceName.Zephyr; break;
          default: primary = VoiceName.Charon; // Fallback
        }
      }
      setVoiceConfig(prev => ({
        ...prev,
        mode: 'single',
        primaryVoice: primary,
        pacing: preset.defaultPacing || 'Natural',
        emotion: preset.defaultEmotion || 'Neutral',
      }));
    }
  }, []);

  // Memoize Header and Controls as they don't change state frequently but receive props
  const MemoizedHeader = useMemo(() => <Header onOpenSettings={() => setShowSettings(true)} />, []);
  const MemoizedLiveSwitcher = useMemo(() => (
    <div className="w-full max-w-4xl mx-auto mb-8 flex justify-center">
      <button 
        onClick={() => setShowLiveInterface(true)}
        className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-900/50 to-slate-900 border border-indigo-500/30 hover:border-indigo-400 rounded-full transition-all group hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]"
        aria-label="Switch to Live Conversation Mode"
      >
        <div className="relative">
          <Activity size={20} className="text-indigo-400" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true"></span>
        </div>
        <span className="text-indigo-200 font-semibold text-sm group-hover:text-white">Switch to Live Conversation Mode</span>
      </button>
    </div>
  ), []);

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-200 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <div className="container mx-auto px-4 pb-20">
        {MemoizedHeader}
        
        {MemoizedLiveSwitcher}

        {showLiveInterface && (
           <LiveInterface onClose={() => setShowLiveInterface(false)} />
        )}

        {showSettings && (
           <SettingsModal onClose={() => setShowSettings(false)} />
        )}
        
        <main className="flex flex-col items-center gap-6">
          {!hasGenerated ? (
            <>
              <TextInput 
                value={text} 
                onChange={setText}
                instruction={instruction}
                onInstructionChange={setInstruction}
                disabled={isGenerating}
                onPresetSelected={handlePresetSelected}
                mode={voiceConfig.mode}
              />
              
              {errorMessage && (
                <div className="w-full max-w-4xl mx-auto animate-fade-in" role="alert">
                  <div className="bg-red-950/40 border border-red-900/50 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} aria-hidden="true" />
                    <div className="flex-1">
                      <h4 className="text-red-400 font-medium text-sm mb-1">Error</h4>
                      <p className="text-red-200/80 text-sm">{errorMessage}</p>
                    </div>
                    <button 
                      onClick={() => setErrorMessage(null)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      aria-label="Close error message"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}

              <ControlPanel 
                onGenerate={handleGenerate} 
                isGenerating={isGenerating}
                voiceConfig={voiceConfig}
                onConfigChange={setVoiceConfig}
                disabled={!text.trim() || isGenerating}
              />
            </>
          ) : (
            <AudioPlayer 
              audioChunks={audioChunks} 
              mimeType={mimeType} 
              onReset={handleReset} 
            />
          )}
        </main>
        
        <footer className="mt-20 text-center text-slate-600 text-sm">
          <p>Powered by Google Gemini 2.5 Flash TTS & Live API</p>
        </footer>
      </div>
    </div>
  );
};

export default App;