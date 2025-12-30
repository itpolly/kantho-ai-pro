
import React from 'react';
import { Play, Loader2, Sparkles, Users, User, Mic, Gauge, Smile, ChevronDown } from 'lucide-react';
import { VoiceName, VoiceConfigState, EmotionOption } from '../types';
import { VOICE_OPTIONS, PACING_OPTIONS, EMOTION_OPTIONS } from '../constants';

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
  
  const toggleMode = () => {
    onConfigChange({
      ...voiceConfig,
      mode: voiceConfig.mode === 'single' ? 'multi' : 'single'
    });
  };

  const handlePrimaryChange = (voice: VoiceName) => {
    onConfigChange({ ...voiceConfig, primaryVoice: voice });
  };

  const handleSecondaryChange = (voice: VoiceName) => {
    onConfigChange({ ...voiceConfig, secondaryVoice: voice });
  };

  // Pacing Slider Helpers
  const currentPacingIndex = PACING_OPTIONS.findIndex(p => p.value === voiceConfig.pacing);
  // Fallback to Natural if undefined (e.g. if loaded preset uses old value)
  const safePacingIndex = currentPacingIndex >= 0 ? currentPacingIndex : 2; 

  const handlePacingSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    const option = PACING_OPTIONS[idx];
    if (option) {
      onConfigChange({ ...voiceConfig, pacing: option.value });
    }
  };

  const handleEmotionSelect = (emotion: EmotionOption) => {
    onConfigChange({ ...voiceConfig, emotion });
  };

  // Labels for the slider points (Short versions)
  const pacingLabels = ['V. Slow', 'Slow', 'Natural', 'Fast', 'Rapid'];

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
            >
              <div 
                 className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-slate-800 rounded-lg shadow-sm transition-all duration-300 ease-out border border-slate-700
                 ${voiceConfig.mode === 'single' ? 'left-1' : 'left-[calc(50%+0px)] translate-x-0'}
                 `} 
              />
              <div className={`relative z-10 flex-1 py-3 text-center text-sm font-semibold transition-colors ${voiceConfig.mode === 'single' ? 'text-white' : 'text-slate-500'}`}>
                 <span className="flex items-center justify-center gap-2"><User size={16} /> Single</span>
              </div>
              <div className={`relative z-10 flex-1 py-3 text-center text-sm font-semibold transition-colors ${voiceConfig.mode === 'multi' ? 'text-amber-500' : 'text-slate-500'}`}>
                 <span className="flex items-center justify-center gap-2"><Users size={16} /> Conversation</span>
              </div>
            </button>
          </div>

          {/* Voice Dropdowns */}
          <div className="w-full lg:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Voice */}
            <div>
              <label className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-3 block">
                {voiceConfig.mode === 'multi' ? 'Speaker 1 (Host/Pro)' : 'Primary Voice'}
              </label>
              <div className="relative">
                <select
                  value={voiceConfig.primaryVoice}
                  onChange={(e) => handlePrimaryChange(e.target.value as VoiceName)}
                  disabled={disabled}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-200 text-sm rounded-xl focus:ring-1 focus:ring-amber-500 focus:border-amber-500 px-4 py-3.5 appearance-none cursor-pointer transition-colors"
                >
                  {VOICE_OPTIONS.map((voice) => (
                    <option key={`p-${voice.value}`} value={voice.value}>
                      {voice.label}
                    </option>
                  ))}
                </select>
                <Mic className="absolute right-4 top-3.5 text-slate-600 pointer-events-none" size={16} />
              </div>
            </div>

            {/* Secondary Voice */}
            {voiceConfig.mode === 'multi' && (
              <div className="animate-fade-in">
                <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 block">
                  Speaker 2 (Guest/Client)
                </label>
                <div className="relative">
                  <select
                    value={voiceConfig.secondaryVoice}
                    onChange={(e) => handleSecondaryChange(e.target.value as VoiceName)}
                    disabled={disabled}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-slate-200 text-sm rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 px-4 py-3.5 appearance-none cursor-pointer transition-colors"
                  >
                    {VOICE_OPTIONS.map((voice) => (
                      <option key={`s-${voice.value}`} value={voice.value}>
                        {voice.label}
                      </option>
                    ))}
                  </select>
                  <Mic className="absolute right-4 top-3.5 text-slate-600 pointer-events-none" size={16} />
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
                <label className="text-xs font-bold text-teal-500 uppercase tracking-wider flex items-center gap-2">
                  <Gauge size={16} /> Pacing Speed
                </label>
                <span className="text-xs font-mono bg-slate-950 px-2 py-1 rounded text-teal-400 border border-slate-800">
                   {PACING_OPTIONS[safePacingIndex]?.label}
                </span>
             </div>
             
             <div className="relative py-2 select-none">
                <input 
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
                />
                
                {/* Clickable Labels */}
                <div className="flex justify-between mt-2 text-[10px] font-medium uppercase tracking-widest px-1 relative z-10">
                   {PACING_OPTIONS.map((opt, index) => (
                      <button 
                        key={opt.value}
                        onClick={() => onConfigChange({ ...voiceConfig, pacing: opt.value })}
                        disabled={disabled}
                        className={`focus:outline-none transition-colors ${
                          voiceConfig.pacing === opt.value 
                            ? 'text-teal-400 font-bold scale-110' 
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {pacingLabels[index]}
                      </button>
                   ))}
                </div>

                {/* Ticks */}
                <div className="absolute top-3 left-0 w-full h-0 flex justify-between px-1.5 pointer-events-none">
                    {PACING_OPTIONS.map((_, i) => (
                        <div key={i} className="w-0.5 h-1 bg-slate-600 rounded-full" />
                    ))}
                </div>
             </div>
          </div>

          {/* Emotion Dropdown */}
          <div className="space-y-4">
             <label className="text-xs font-bold text-pink-500 uppercase tracking-wider flex items-center gap-2">
                <Smile size={16} /> Emotional Tone
             </label>
             
             <div className="relative group">
                <div className="absolute inset-0 bg-pink-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <select
                  value={voiceConfig.emotion}
                  onChange={(e) => handleEmotionSelect(e.target.value as EmotionOption)}
                  disabled={disabled}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-pink-500/50 text-slate-200 text-sm rounded-xl focus:ring-1 focus:ring-pink-500 focus:border-pink-500 px-4 py-3.5 appearance-none cursor-pointer transition-colors shadow-sm relative z-10"
                >
                  {EMOTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover:text-pink-500 transition-colors z-20">
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
      >
        {isGenerating ? (
          <>
            <Loader2 className="animate-spin relative z-10" size={24} />
            <span className="relative z-10">Processing Studio Audio...</span>
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none"></div>
            <Sparkles size={22} className={`relative z-10 ${disabled ? '' : 'text-amber-200 animate-pulse'}`} />
            <span className="relative z-10">Generate Studio Speech</span>
            <Play size={22} className={`relative z-10 ${disabled ? '' : 'fill-current'}`} />
          </>
        )}
      </button>
    </div>
  );
};

export default ControlPanel;
