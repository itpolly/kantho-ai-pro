
import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, Key, Cpu, Zap } from 'lucide-react';
import { getSettings, saveSettings, DEFAULT_SETTINGS } from '../utils/storageUtils';
import { AppSettings } from '../types';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showKey, setShowKey] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const handleSave = () => {
    saveSettings(settings);
    setHasSaved(true);
    setTimeout(() => {
        setHasSaved(false);
        onClose();
    }, 800);
  };

  const handleReset = () => {
    if (confirm("Reset all settings to default? This will clear your custom API key.")) {
        setSettings(DEFAULT_SETTINGS);
        saveSettings(DEFAULT_SETTINGS);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="bg-slate-800/50 p-5 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3 text-slate-200">
            <Cpu size={24} className="text-amber-500" />
            <h3 className="font-bold text-xl">Global Configuration</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
           
           {/* API Key Section */}
           <div className="space-y-3">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                 <Key size={14} /> Gemini API Key
              </label>
              <div className="relative">
                 <input 
                   type={showKey ? "text" : "password"}
                   value={settings.apiKey}
                   onChange={(e) => setSettings({...settings, apiKey: e.target.value})}
                   placeholder="Enter your API Key (AI Studio)"
                   className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-4 pr-12 py-3 text-slate-200 focus:border-amber-500 outline-none font-mono text-sm"
                 />
                 <button 
                   onClick={() => setShowKey(!showKey)}
                   className="absolute right-3 top-3 text-xs text-slate-500 hover:text-slate-300 uppercase font-semibold"
                 >
                    {showKey ? "Hide" : "Show"}
                 </button>
              </div>
              <p className="text-xs text-slate-500">
                 Leave empty to use the built-in system key (if available). Your key is stored locally in your browser.
              </p>
           </div>

           <div className="h-px bg-slate-800 w-full" />

           {/* Models Section */}
           <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Model Selection</h4>

              {/* TTS Model */}
              <div className="space-y-1">
                 <label className="text-xs text-slate-500">Text-to-Speech Model</label>
                 <div className="relative">
                    <input 
                      type="text"
                      value={settings.models.tts}
                      onChange={(e) => setSettings({
                          ...settings, 
                          models: { ...settings.models, tts: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 text-sm focus:border-amber-500 outline-none"
                    />
                 </div>
                 <p className="text-[10px] text-slate-600">Default: gemini-2.5-flash-preview-tts</p>
              </div>

              {/* Script Model */}
              <div className="space-y-1">
                 <label className="text-xs text-slate-500">Script Gen & Analysis Model</label>
                 <div className="relative">
                    <select 
                      value={settings.models.script}
                      onChange={(e) => setSettings({
                          ...settings, 
                          models: { ...settings.models, script: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 text-sm focus:border-amber-500 outline-none appearance-none"
                    >
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended)</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                        <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Experimental</option>
                    </select>
                 </div>
              </div>

              {/* Live Model */}
              <div className="space-y-1">
                 <label className="text-xs text-slate-500 flex items-center gap-1">
                    <Zap size={10} className="text-yellow-500" /> Live API Model
                 </label>
                 <div className="relative">
                    <input 
                      type="text"
                      value={settings.models.live}
                      onChange={(e) => setSettings({
                          ...settings, 
                          models: { ...settings.models, live: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 text-sm focus:border-amber-500 outline-none"
                    />
                 </div>
                 <p className="text-[10px] text-slate-600">Default: gemini-2.5-flash-native-audio-preview-09-2025</p>
              </div>

           </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
            <button 
              onClick={handleReset}
              className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-red-400 transition-colors"
            >
               <RefreshCw size={14} /> Reset Defaults
            </button>

            <button 
              onClick={handleSave}
              className={`
                 px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all
                 ${hasSaved ? 'bg-green-600 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20'}
              `}
            >
               {hasSaved ? <div className="flex items-center gap-2"><div className="w-2 h-2 bg-white rounded-full animate-ping"/> Saved</div> : <><Save size={16} /> Save Changes</>}
            </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
