import React, { useCallback, useMemo } from 'react';
import { Play, Loader2, Sparkles, Users, User, Mic, Gauge, Smile, ChevronDown } from 'lucide-react';
import { VoiceName, VoiceConfigState, EmotionOption } from '../lib/types'; // Updated import path
import { VOICE_OPTIONS, PACING_OPTIONS, EMOTION_OPTIONS } from '../lib/constants'; // Updated import path

interface ControlPanelProps {
  onGenerate: () => void;
  isGenerating: boolean;
  voiceConfig: VoiceConfigState;
  onConfigChange: (config: VoiceConfigState) => void;
  disabled: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  onGenerate,
  isGenerating,
  voiceConfig,
  onConfigChange,
  disabled
}) => {
  
  const toggleMode = useCallback(() => {
    onConfigChange(prevConfig => ({
      ...prevConfig,
      mode: prevConfig.mode === 'single' ? 'multi' : 'single'
    }));
  }, [onConfigChange]);

  const handlePrimaryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onConfigChange(prevConfig => ({ ...prevConfig, primaryVoice: e.target.value as VoiceName }));
  }, [onConfigChange]);

  const handleSecondaryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onConfigChange(prevConfig => ({ ...prevConfig, secondaryVoice: e.target.value as VoiceName }));
  }, [onConfigChange]);

  // Pacing Slider Helpers
  const currentPacingIndex = useMemo(() => PACING_OPTIONS.findIndex(p => p.value === voiceConfig.pacing), [voiceConfig.pacing]);
  const safePacingIndex = currentPacingIndex >= 0 ? currentPacingIndex : 2; // Fallback to Natural

  const handlePacingSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    const option = PACING_OPTIONS[idx];
    if (option) {
      onConfigChange(prevConfig => ({ ...prevConfig, pacing: option.value }));
    }
  }, [onConfigChange]);

  const handlePacingButtonClick = useCallback((pacingValue: EmotionOption) => {
    onConfigChange(prevConfig => ({ ...prevConfig, pacing: pacingValue }));
  }, [onConfigChange]);

  const handleEmotionSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onConfigChange(prevConfig => ({ ...prevConfig, emotion: e.target.value as EmotionOption }));
  }, [onConfigChange]);

  // Labels for the slider points (Short versions)
  const pacingLabels = useMemo(() => ['V. Slow', 'Slow', 'Natural', 'Fast', 'Rapid'], []);

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 flex flex-col gap-6 animate-fade-in-up">
      
      {/* Settings Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-8">
        
        {/* Top Section: Mode & Voices */}
        <div className="flex flex-col lg:flex-row gap-6 pb-6 border-b border-slate-800/50">
          
          {/* Mode Toggle */}
          <div className="w-full lg:w-1/3">
             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Generation Mode</label>
             <button
              onClick={toggleMode}
              disabled={disabled}
              className={`
                 relative w-full p-1 rounded-xl flex items-center bg-slate-950 border border-slate-800 transition-all
                 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              aria-label={voiceConfig.mode === 'single' ? "Switch to multi-speaker mode" : "Switch to single-speaker mode"}
              aria-pressed={voiceConfig.mode === 'multi'}
            >
              <div 
                 className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-slate-800 rounded-lg shadow-sm transition-all duration-300 ease-out border border-slate-700
                 ${voiceConfig.mode === 'single' ? 'left-1' : 'left-[calc(50%+0px)] translate-x-0'}
                 `} 
                 aria-hidden="true"
              />
              <div className={`relative z-10 flex-1 py-3 text-center text-sm font-semibold transition-colors ${voiceConfig.mode === 'single' ? 'text-white' : 'text-slate-500'}`}>
                 <span className="flex items-center justify-center gap-2"><User size={16} aria-hidden="true" /> Single</span>
              </div>
              <div className={`relative z-10 flex-1 py-3 text-center text-sm font-semibold transition-colors ${voiceConfig.mode === 'multi' ? 'text-amber-500' : 'text-slate-500'}`}>
                 <span className="flex items-center justify-center gap-2"><Users size={16} aria-hidden="true" /> Conversation</span>
              </div>
            </button>
          </div>

          {/* Voice Dropdowns */}
          <div className="w-full lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Voice */}
            <div>
              <label htmlFor="primary-voice-select" className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-3 block">
                {voiceConfig.mode === 'multi' ? 'Speaker 1 (Host/Pro)' : 'Primary Voice'}
              </label>
              <div className="relative">
                <select
                  id="primary-voice-select"
                  value={voiceConfig.primaryVoice}
                  onChange={handlePrimaryChange}
                  disabled={disabled}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-200 text-sm rounded-xl focus:ring-1 focus:ring-amber-500 focus:border-amber-500 px-4 py-3.5 appearance-none cursor-pointer transition-colors"
                  aria-label="Select primary voice"
                >
                  {VOICE_OPTIONS.map((voice) => (
                    <option key={`p-${voice.value}`} value={voice.value}>
                      {voice.label}
                    </option>
                  ))}
                </select>
                <Mic className="absolute right-4 top-3.5 text-slate-600 pointer-events-none" size={16} aria-hidden="true" />
              </div>
            </div>

            {/* Secondary Voice */}
            {voiceConfig.mode === 'multi' && (
              <div className="animate-fade-in">
                <label htmlFor="secondary-voice-select" className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 block">
                  Speaker 2 (Guest/Client)
                </label>
                <div className="relative">
                  <select
                    id="secondary-voice-select"
                    value={voiceConfig.secondaryVoice}
                    onChange={handleSecondaryChange}
                    disabled={disabled}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-slate-200 text-sm rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 px-4 py-3.5 appearance-none cursor-pointer transition-colors"
                    aria-label="Select secondary voice"
                  >
                    {VOICE_OPTIONS.map((voice) => (
                      <option key={`s-${voice.value}`} value={voice.value}>
                        {voice.label}
                      </option>
                    ))}
                  </select>
                  <Mic className="absolute right-4 top-3.5 text-slate-600 pointer-events-none" size={16} aria-hidden="true" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Performance Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          
          {/* Pacing Slider */}
          <div className="space-y-4">
             <div className="flex justify-between items-center">
                <label htmlFor="pacing-slider" className="text-xs font-bold text-teal-500 uppercase tracking-wider flex items-center gap-2">
                  <Gauge size={16} aria-hidden="true" /> Pacing Speed
                </label>
                <span className="text-xs font-mono bg-slate-950 px-2 py-1 rounded text-teal-400 border border-slate-800" aria-live="polite">
                   {PACING_OPTIONS[safePacingIndex]?.label}
                </span>
             </div>
             
             <div className="relative py-2 select-none">
                <input 
                  id="pacing-slider"
                  type="range"
                  min="0"
                  max={PACING_OPTIONS.length - 1}
                  step="1"
                  value={safePacingIndex}
                  onChange={handlePacingSliderChange}
                  disabled={disabled}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500 focus:outline-none disabled:opacity-50"
                  style={{
                    background: `linear-gradient(to right, #14b8a6 ${safePacingIndex * (100 / (PACING_OPTIONS.length - 1))}%, #1e293b ${safePacingIndex * (100 / (PACING_OPTIONS.length - 1))}%)`
                  }}
                  aria-valuenow={safePacingIndex}
                  aria-valuemin={0}
                  aria-valuemax={PACING_OPTIONS.length - 1}
                  aria-valuetext={PACING_OPTIONS[safePacingIndex]?.label}
                  aria-label="Pacing speed slider"
                />
                
                {/* Clickable Labels */}
                <div className="flex justify-between mt-2 text-[10px] font-medium uppercase tracking-widest px-1 relative z-10">
                   {PACING_OPTIONS.map((opt, index) => (
                      <button 
                        key={opt.value}
                        onClick={() => handlePacingButtonClick(opt.value)}
                        disabled={disabled}
                        className={`focus:outline-none transition-colors ${
                          voiceConfig.pacing === opt.value 
                            ? 'text-teal-400 font-bold scale-110' 
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                        aria-label={`Set pacing to ${opt.value}`}
                      >
                        {pacingLabels[index]}
                      </button>
                   ))}
                </div>

                {/* Ticks */}
                <div className="absolute top-3 left-0 w-full h-0 flex justify-between px-1.5 pointer-events-none">
                    {PACING_OPTIONS.map((_, i) => (
                        <div key={i} className="w-0.5 h-1 bg-slate-600 rounded-full" aria-hidden="true" />
                    ))}
                </div>
             </div>
          </div>

          {/* Emotion Dropdown */}
          <div className="space-y-4">
             <label htmlFor="emotion-select" className="text-xs font-bold text-pink-500 uppercase tracking-wider flex items-center gap-2">
                <Smile size={16} aria-hidden="true" /> Emotional Tone
             </label>
             
             <div className="relative group">
                <div className="absolute inset-0 bg-pink-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" aria-hidden="true" />
                <select
                  id="emotion-select"
                  value={voiceConfig.emotion}
                  onChange={handleEmotionSelect}
                  disabled={disabled}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-pink-500/50 text-slate-200 text-sm rounded-xl focus:ring-1 focus:ring-pink-500 focus:border-pink-500 px-4 py-3.5 appearance-none cursor-pointer transition-colors shadow-sm relative z-10"
                  aria-label="Select emotional tone"
                >
                  {EMOTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover:text-pink-500 transition-colors z-20" aria-hidden="true">
                  <ChevronDown size={18} />
                </div>
             </div>
             
             <p className="text-[10px] text-slate-500 px-1">
                Controls the prosody and emotional weight of the generated speech.
             </p>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={disabled || isGenerating}
        className={`
          group w-full flex items-center justify-center space-x-3 
          py-6 rounded-2xl font-bold text-lg tracking-wide transition-all duration-300 transform shadow-2xl relative overflow-hidden
          ${disabled || isGenerating
            ? 'bg-slate-900 text-slate-500 cursor-not-allowed border border-slate-800' 
            : 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] hover:scale-[1.01]'
          }
        `}
        aria-label={isGenerating ? "Generating studio speech" : "Generate studio speech"}
      >
        {isGenerating ? (
          <>
            <Loader2 className="animate-spin relative z-10" size={24} aria-hidden="true" />
            <span className="relative z-10">Processing Studio Audio...</span>
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" aria-hidden="true"></div>
            <Sparkles size={22} className={`relative z-10 ${disabled ? '' : 'text-amber-200 animate-pulse'}`} aria-hidden="true" />
            <span className="relative z-10">Generate Studio Speech</span>
            <Play size={22} className={`relative z-10 ${disabled ? '' : 'fill-current'}`} aria-hidden="true" />
          </>
        )}
      </button>
    </div>
  );
};

export default React.memo(ControlPanel);