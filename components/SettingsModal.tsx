import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, RefreshCw, Key, Cpu, Zap, CheckCircle, XCircle } from 'lucide-react';
import { getSettings, saveSettings, DEFAULT_SETTINGS, TTS_MODEL_OPTIONS, SCRIPT_MODEL_OPTIONS, LIVE_MODEL_OPTIONS } from '../lib/utils/storageUtils.js'; // Added .js extension
import { AppSettings } from '../lib/types.js'; // Added .js extension

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasSaved, setHasSaved] = useState(false);

  // State for custom model inputs
  const [customTtsModel, setCustomTtsModel] = useState<string>('');
  const [customScriptModel, setCustomScriptModel] = useState<string>('');
  const [customLiveModel, setCustomLiveModel] = useState<string>('');

  useEffect(() => {
    const currentSettings = getSettings();
    setSettings(currentSettings);
    // Initialize custom model inputs based on current settings if they don't match predefined options
    if (!TTS_MODEL_OPTIONS.some(o => o.value === currentSettings.models.tts)) {
      setCustomTtsModel(currentSettings.models.tts);
    }
    if (!SCRIPT_MODEL_OPTIONS.some(o => o.value === currentSettings.models.script)) {
      setCustomScriptModel(currentSettings.models.script);
    }
    if (!LIVE_MODEL_OPTIONS.some(o => o.value === currentSettings.models.live)) {
      setCustomLiveModel(currentSettings.models.live);
    }
  }, []);

  const handleSave = useCallback(() => {
    // Apply custom model values if "custom" is selected in dropdowns
    const finalSettings = {
      ...settings,
      models: {
        tts: settings.models.tts === 'custom' ? customTtsModel : settings.models.tts,
        script: settings.models.script === 'custom' ? customScriptModel : settings.models.script,
        live: settings.models.live === 'custom' ? customLiveModel : settings.models.live,
      },
    };
    saveSettings(finalSettings);
    setHasSaved(true);
    setTimeout(() => {
        setHasSaved(false);
        onClose();
    }, 800);
  }, [settings, customTtsModel, customScriptModel, customLiveModel, onClose]);

  const handleReset = useCallback(() => {
    if (confirm("Reset all settings to default?")) {
        setSettings(DEFAULT_SETTINGS);
        saveSettings(DEFAULT_SETTINGS);
        setCustomTtsModel('');
        setCustomScriptModel('');
        setCustomLiveModel('');
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="bg-slate-800/50 p-5 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3 text-slate-200">
            <Cpu size={24} className="text-amber-500" aria-hidden="true" />
            <h3 id="settings-modal-title" className="font-bold text-xl">Global Configuration</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors" aria-label="Close settings">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
           
           {/* API Key Section - REMOVED as per guidelines */}
           <div className="bg-blue-950/20 border border-blue-900/50 rounded-lg p-3 text-sm text-blue-200 flex items-center gap-3" role="status">
             <Key size={18} className="text-blue-400" aria-hidden="true" />
             <p>GenAI Key is sourced from <code>process.env.API_KEY</code> and cannot be changed here.</p>
           </div>

           <div className="h-px bg-slate-800 w-full" role="separator" />

           {/* Models Section */}
           <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Model Selection</h4>

              {/* TTS Model */}
              <div className="space-y-1">
                 <label htmlFor="tts-model-select" className="text-xs text-slate-500">Text-to-Speech Model</label>
                 <div className="relative">
                    <select 
                      id="tts-model-select"
                      value={settings.models.tts}
                      onChange={(e) => setSettings({
                          ...settings, 
                          models: { ...settings.models, tts: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 text-sm focus:border-amber-500 outline-none appearance-none cursor-pointer"
                      aria-label="Text-to-Speech Model selection"
                    >
                        {TTS_MODEL_OPTIONS.map(option => (
                           <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    {settings.models.tts === 'custom' && (
                      <input
                        type="text"
                        value={customTtsModel}
                        onChange={(e) => setCustomTtsModel(e.target.value)}
                        placeholder="Enter custom TTS model ID"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 text-sm focus:border-amber-500 outline-none mt-2"
                        aria-label="Custom Text-to-Speech model ID input"
                      />
                    )}
                 </div>
                 <p className="text-[10px] text-slate-600">
                   Used for generating high-quality speech from text.
                 </p>
              </div>

              {/* Script Model */}
              <div className="space-y-1">
                 <label htmlFor="script-model-select" className="text-xs text-slate-500">Script Gen & Analysis Model</label>
                 <div className="relative">
                    <select 
                      id="script-model-select"
                      value={settings.models.script}
                      onChange={(e) => setSettings({
                          ...settings, 
                          models: { ...settings.models, script: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 text-sm focus:border-amber-500 outline-none appearance-none cursor-pointer"
                      aria-label="Script Generation and Analysis Model selection"
                    >
                        {SCRIPT_MODEL_OPTIONS.map(option => (
                           <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    {settings.models.script === 'custom' && (
                      <input
                        type="text"
                        value={customScriptModel}
                        onChange={(e) => setCustomScriptModel(e.target.value)}
                        placeholder="Enter custom Script model ID"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 text-sm focus:border-amber-500 outline-none mt-2"
                        aria-label="Custom Script Generation and Analysis model ID input"
                      />
                    )}
                 </div>
                 <p className="text-[10px] text-slate-600">
                   Powers AI script generation and voice cloning analysis.
                 </p>
              </div>

              {/* Live Model */}
              <div className="space-y-1">
                 <label htmlFor="live-api-model-select" className="text-xs text-slate-500 flex items-center gap-1">
                    <Zap size={10} className="text-yellow-500" aria-hidden="true" /> Live API Model
                 </label>
                 <div className="relative">
                    <select 
                      id="live-api-model-select"
                      value={settings.models.live}
                      onChange={(e) => setSettings({
                          ...settings, 
                          models: { ...settings.models, live: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 text-sm focus:border-amber-500 outline-none appearance-none cursor-pointer"
                      aria-label="Live API Model selection"
                    >
                        {LIVE_MODEL_OPTIONS.map(option => (
                           <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    {settings.models.live === 'custom' && (
                      <input
                        type="text"
                        value={customLiveModel}
                        onChange={(e) => setCustomLiveModel(e.target.value)}
                        placeholder="Enter custom Live API model ID"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 text-sm focus:border-amber-500 outline-none mt-2"
                        aria-label="Custom Live API model ID input"
                      />
                    )}
                 </div>
                 <p className="text-[10px] text-slate-600">
                   Used for real-time, low-latency voice conversations.
                 </p>
              </div>

           </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-red-400 transition-colors"
              aria-label="Reset all settings to default"
            >
               <RefreshCw size={14} aria-hidden="true" /> Reset Defaults
            </button>

            <button 
              onClick={handleSave}
              className={`
                 px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all
                 ${hasSaved ? 'bg-green-600 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20'}
              `}
              aria-label={hasSaved ? "Settings saved" : "Save changes"}
            >
               {hasSaved ? <div className="flex items-center gap-2" aria-live="polite"><div className="w-2 h-2 bg-white rounded-full animate-ping" aria-hidden="true"/> Saved</div> : <><Save size={16} aria-hidden="true" /> Save Changes</>}
            </button>
        </div>

      </div>
    </div>
  );
};

export default React.memo(SettingsModal);