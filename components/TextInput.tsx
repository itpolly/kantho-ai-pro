import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings2, ChevronDown, ChevronUp, Save, Trash2, Plus, Check, Info, Mic2, Sparkles, Globe, Type, Loader2, X, Image as ImageIcon, Upload } from 'lucide-react';
import { PersonaPreset, VoiceName } from '../lib/types.js'; // Added .js extension
import { DEFAULT_PRESETS } from '../lib/constants.js'; // Added .js extension
import VoiceCloner from './VoiceCloner.js'; // Added .js extension
import { generateScript } from '../lib/api/geminiService.js'; // Added .js extension
import { blobToBase64 } from '../lib/utils/audioUtils.js'; // Added .js extension

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  instruction: string;
  onInstructionChange: (value: string) => void;
  disabled: boolean;
  onPresetSelected?: (preset: PersonaPreset) => void;
  mode: 'single' | 'multi';
}

const TextInput: React.FC<TextInputProps> = ({ 
  value, 
  onChange, 
  instruction, 
  onInstructionChange, 
  disabled,
  onPresetSelected,
  mode
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [presets, setPresets] = useState<PersonaPreset[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [showCloner, setShowCloner] = useState(false);

  // Script Generator State
  const [showScriptGen, setShowScriptGen] = useState(false);
  const [scriptMode, setScriptMode] = useState<'topic' | 'url' | 'image'>('topic');
  const [scriptInput, setScriptInput] = useState("");
  const [scriptImage, setScriptImage] = useState<File | null>(null);
  const [scriptImagePreview, setScriptImagePreview] = useState<string | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('kontho_presets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const userPresets = parsed.filter((p: PersonaPreset) => !p.isDefault);
        setPresets([...DEFAULT_PRESETS, ...userPresets]);
      } catch (e) {
        setPresets(DEFAULT_PRESETS);
      }
    } else {
      setPresets(DEFAULT_PRESETS);
    }
  }, []);

  useEffect(() => {
    if (presets.length > 0) {
      localStorage.setItem('kontho_presets', JSON.stringify(presets));
    }
  }, [presets]);

  const handleSelectPreset = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPresetId(id);
    const preset = presets.find(p => p.id === id);
    if (preset) {
      onInstructionChange(preset.instruction);
      if (preset.sampleText !== undefined) {
        onChange(preset.sampleText);
      }
      if (onPresetSelected) {
        onPresetSelected(preset);
      }
    }
  }, [presets, onInstructionChange, onChange, onPresetSelected]);

  const handleSavePreset = useCallback(() => {
    if (!newPresetName.trim()) return;
    const newPreset: PersonaPreset = {
      id: `custom_${Date.now()}`,
      name: newPresetName,
      instruction: instruction,
      sampleText: value,
      isDefault: false,
      isMultiSpeaker: mode === 'multi'
    };
    setPresets(prev => [...prev, newPreset]);
    setSelectedPresetId(newPreset.id);
    setIsSaving(false);
    setNewPresetName("");
  }, [newPresetName, instruction, value, mode]);

  const handleDeletePreset = useCallback((id: string) => {
    if (confirm("Are you sure you want to delete this preset?")) {
      setPresets(prev => prev.filter(p => p.id !== id));
      if (selectedPresetId === id) setSelectedPresetId("");
    }
  }, [selectedPresetId]);
  
  const handleCloneSuccess = useCallback((newPreset: PersonaPreset) => {
    setPresets(prev => [...prev, newPreset]);
    setSelectedPresetId(newPreset.id);
    onInstructionChange(newPreset.instruction);
    if (onPresetSelected) onPresetSelected(newPreset);
    setShowSettings(true);
  }, [onInstructionChange, onPresetSelected]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("Image file is too large (max 5MB). Please choose a smaller file.");
        return;
      }
      setScriptImage(file);
      setScriptImagePreview(URL.createObjectURL(file));
    }
  }, []);

  const handleGenerateScript = useCallback(async () => {
    // Validation for different modes
    if (scriptMode === 'url' && (!scriptInput.trim() || !scriptInput.startsWith('http'))) {
      alert("Please enter a valid URL for webpage script generation.");
      return;
    }
    if (scriptMode === 'topic' && !scriptInput.trim()) {
      alert("Please enter a topic for script generation.");
      return;
    }
    if (scriptMode === 'image' && !scriptImage && !scriptInput.trim()) {
      alert("Please upload an image OR provide a description for image-based script generation.");
      return;
    }

    setIsGeneratingScript(true);
    
    const currentPreset = presets.find(p => p.id === selectedPresetId);
    
    const generationContext: any = {
      isMultiSpeaker: mode === 'multi',
      presetName: currentPreset?.name || 'Custom Setup',
      presetInstruction: instruction
    };

    try {
        if (scriptMode === 'image' && scriptImage) {
           const base64 = await blobToBase64(scriptImage);
           generationContext.image = {
             data: base64,
             mimeType: scriptImage.type
           };
        }

        const script = await generateScript(scriptInput, scriptMode, generationContext);
        if (script) {
            onChange(script);
            setShowScriptGen(false);
            setScriptInput("");
            setScriptImage(null);
            setScriptImagePreview(null);
        }
    } catch (e: any) {
        console.error("Script generation error:", e);
        const errStr = e?.message || JSON.stringify(e);
        if (errStr.includes('429') || errStr.toLowerCase().includes('quota')) {
           alert("Quota Exceeded: The AI script generator is currently busy. Please wait a moment before trying again.");
        } else if (errStr.toLowerCase().includes('safety')) {
           alert("Script generation blocked due to safety concerns. Please refine your input.");
        } else if (errStr.toLowerCase().includes('not_found') || errStr.includes('404')) {
           alert("Model Not Found / Permissions Error: Check your GenAI Key or project settings.");
        }
        else {
           alert("Could not generate script. Please try again with a different input.");
        }
    } finally {
        setIsGeneratingScript(false);
    }
  }, [scriptMode, scriptInput, scriptImage, presets, selectedPresetId, mode, instruction, onChange]);

  const getPlaceholderText = useCallback(() => {
    switch(scriptMode) {
      case 'topic': return "E.g. A mystery story about a detective in Dhaka...";
      case 'url': return "E.g. https://www.prothomalo.com/bangladesh/latest-news";
      case 'image': return "Optional: Describe what you want from this image...";
      default: return "";
    }
  }, [scriptMode]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {showCloner && (
        <VoiceCloner 
          onClose={() => setShowCloner(false)} 
          onCloneSuccess={handleCloneSuccess} 
        />
      )}
      
      {/* System Instruction / Persona Editor */}
      <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 transition-all duration-300 shadow-lg">
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="w-full px-4 py-3 bg-slate-800/50 flex justify-between items-center text-xs font-semibold text-slate-400 hover:text-amber-400 uppercase tracking-wider transition-colors"
          aria-expanded={showSettings}
          aria-controls="persona-settings-panel"
          aria-label={showSettings ? "Hide persona settings" : "Show persona settings"}
        >
          <div className="flex items-center space-x-2">
            <Settings2 size={14} aria-hidden="true" />
            <span>Customize Persona & Rules</span>
          </div>
          <div className="flex items-center space-x-2">
            {selectedPresetId && (
              <span className="text-amber-500/80 font-normal normal-case mr-2">
                 {presets.find(p => p.id === selectedPresetId)?.name}
              </span>
            )}
            {showSettings ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
          </div>
        </button>
        
        {showSettings && (
          <div id="persona-settings-panel" className="p-4 bg-slate-900 border-t border-slate-800 animate-fade-in space-y-3">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-800">
               <div className="flex-1 flex items-center space-x-2">
                 <select 
                   value={selectedPresetId}
                   onChange={handleSelectPreset}
                   disabled={disabled}
                   className="bg-slate-950 border border-slate-700 text-slate-300 text-sm rounded-md focus:ring-amber-500 focus:border-amber-500 block p-2 w-full md:w-64 cursor-pointer"
                   aria-label="Select a persona preset"
                 >
                   <option value="" disabled>Select a Preset...</option>
                   <optgroup label="Defaults">
                     {presets.filter(p => p.isDefault).map(p => (
                       <option key={p.id} value={p.id}>{p.name}</option>
                     ))}
                   </optgroup>
                   {presets.some(p => !p.isDefault) && (
                     <optgroup label="My Custom Personas">
                       {presets.filter(p => !p.isDefault).map(p => (
                         <option key={p.id} value={p.id}>{p.name}</option>
                       ))}
                     </optgroup>
                   )}
                 </select>
                 
                 {selectedPresetId && !presets.find(p => p.id === selectedPresetId)?.isDefault && (
                    <button onClick={() => handleDeletePreset(selectedPresetId)} className="p-2 text-red-400 hover:bg-red-900/30 rounded-md transition-colors" aria-label="Delete selected preset">
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                 )}
                 <button onClick={() => setShowCloner(true)} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 border border-indigo-500/50 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-md text-xs font-semibold transition-all ml-2" aria-label="Open Voice Lab for voice cloning">
                    <Mic2 size={14} aria-hidden="true" /> <span>Voice Lab</span>
                 </button>
               </div>
               <div className="flex items-center justify-end">
                 {isSaving ? (
                   <div className="flex items-center space-x-2 animate-fade-in-right">
                     <input 
                       type="text" value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)}
                       placeholder="Preset Name..." className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-md p-2 w-40 focus:outline-none focus:border-amber-500"
                       autoFocus
                       aria-label="New preset name"
                     />
                     <button onClick={handleSavePreset} className="p-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md" aria-label="Save preset"><Check size={16} aria-hidden="true" /></button>
                     <button onClick={() => setIsSaving(false)} className="p-2 text-slate-400 hover:text-white" aria-label="Cancel saving preset"><X size={16} aria-hidden="true" /></button> {/* Changed Plus to X for cancel */}
                   </div>
                 ) : (
                   <button onClick={() => setIsSaving(true)} disabled={disabled} className="flex items-center space-x-1 text-xs font-semibold text-amber-500 hover:text-amber-400 px-3 py-2 rounded-md hover:bg-slate-800 transition-colors" aria-label="Save current persona as a new preset">
                     <Save size={14} aria-hidden="true" /> <span>Save as Preset</span>
                   </button>
                 )}
               </div>
             </div>
             <div className="space-y-1">
               <textarea
                value={instruction}
                onChange={(e) => {
                  onInstructionChange(e.target.value);
                  if (selectedPresetId) setSelectedPresetId("");
                }}
                disabled={disabled}
                className="w-full h-40 p-3 bg-slate-950 text-sm font-mono text-amber-100/80 placeholder-slate-700 focus:outline-none border border-slate-700 rounded-lg resize-y custom-scrollbar"
                spellCheck={false}
                aria-label="System instruction for the voice persona"
              />
             </div>
          </div>
        )}
      </div>

      {/* Script Generator Panel */}
      {showScriptGen && (
        <div className="bg-slate-900 rounded-xl border border-amber-500/30 p-4 animate-fade-in shadow-2xl relative">
            <button onClick={() => setShowScriptGen(false)} className="absolute top-3 right-3 text-slate-500 hover:text-white" aria-label="Close script generator"><X size={16} aria-hidden="true" /></button>
            <div className="flex items-center gap-2 mb-4 text-amber-500">
               <Sparkles size={18} className="animate-pulse" aria-hidden="true" />
               <h3 className="font-bold text-sm uppercase tracking-wide">Magic Script Generator</h3>
            </div>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
               {[
                 { id: 'topic', label: 'From Topic', icon: Type, color: 'text-amber-500', bg: 'bg-amber-500/20' },
                 { id: 'url', label: 'From Webpage', icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/20' },
                 { id: 'image', label: 'From Image', icon: ImageIcon, color: 'text-pink-400', bg: 'bg-pink-500/20' }
               ].map((m) => (
                 <button
                   key={m.id}
                   onClick={() => { setScriptMode(m.id as any); setScriptInput(""); setScriptImage(null); setScriptImagePreview(null); }}
                   className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                      scriptMode === m.id 
                      ? `${m.bg} ${m.color} border border-${m.color.split('-')[1]}-500/50` 
                      : 'bg-slate-950 text-slate-500 border border-slate-800 hover:border-slate-700'
                   }`}
                   aria-pressed={scriptMode === m.id}
                   aria-label={`Generate script ${m.label.toLowerCase()}`}
                 >
                   <m.icon size={14} aria-hidden="true" /> {m.label}
                 </button>
               ))}
            </div>

            {/* Input Area */}
            <div className="flex flex-col gap-3">
                {scriptMode === 'image' && (
                   <div className="w-full border-2 border-dashed border-slate-700 hover:border-pink-500/50 rounded-lg p-6 bg-slate-950 flex flex-col items-center justify-center transition-colors">
                      {scriptImagePreview ? (
                        <div className="relative w-full h-48 rounded-md overflow-hidden bg-black/50 flex items-center justify-center">
                           <img src={scriptImagePreview} alt="Preview" className="max-w-full max-h-full object-contain" />
                           <button 
                             onClick={() => { setScriptImage(null); setScriptImagePreview(null); }}
                             className="absolute top-2 right-2 p-1 bg-black/70 text-white rounded-full hover:bg-red-500 transition-colors"
                             aria-label="Remove image"
                           >
                             <X size={14} aria-hidden="true" />
                           </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-2 w-full h-full" aria-label="Upload image for script generation">
                           <Upload size={32} className="text-slate-600" aria-hidden="true" />
                           <span className="text-sm text-slate-400 font-medium">Click to Upload Image</span>
                           <span className="text-xs text-slate-600">Supports JPG, PNG (Max 5MB)</span>
                           <input 
                             type="file" 
                             ref={fileInputRef} 
                             className="hidden" 
                             accept="image/jpeg, image/png, image/webp" 
                             onChange={handleImageUpload} 
                           />
                        </label>
                      )}
                   </div>
                )}

                <div className="flex gap-2">
                  <input 
                     type="text"
                     value={scriptInput}
                     onChange={(e) => setScriptInput(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleGenerateScript()}
                     placeholder={getPlaceholderText()}
                     className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:border-amber-500 outline-none placeholder:text-slate-600"
                     autoFocus
                     aria-label={`Script input for ${scriptMode}`}
                  />
                  <button
                     onClick={handleGenerateScript}
                     disabled={isGeneratingScript || 
                       (scriptMode === 'topic' && !scriptInput.trim()) ||
                       (scriptMode === 'url' && (!scriptInput.trim() || !scriptInput.startsWith('http'))) ||
                       (scriptMode === 'image' && !scriptImage && !scriptInput.trim())
                     }
                     className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg font-semibold text-xs transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                     aria-label="Generate script"
                  >
                     {isGeneratingScript ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
                     Generate
                  </button>
                </div>
            </div>
        </div>
      )}

      {/* Main Input */}
      <div className="relative p-1">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-amber-900 rounded-xl opacity-30 blur-sm pointer-events-none"></div>
        <div className="relative bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-800">
          <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Script Input</span>
                {!showScriptGen && (
                    <button onClick={() => setShowScriptGen(true)} className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded text-[10px] font-semibold transition-colors border border-amber-500/20" aria-label="Open AI script generator">
                      <Sparkles size={10} aria-hidden="true" /> <span>Write with AI</span>
                    </button>
                )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="hidden md:flex items-center space-x-1 text-[10px] text-slate-500 border border-slate-700 px-2 py-0.5 rounded" aria-live="polite">
                <Info size={10} aria-hidden="true" /> <span>{mode === 'multi' ? 'Conversation Mode' : 'Single Speaker'}</span>
              </span>
            </div>
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={mode === 'multi' ? "Speaker 1: Type the first speaker's line here...\nSpeaker 2: Type the second speaker's response here..." : "Write your script here in Bengali..."}
            style={{ fontFamily: "'Hind Siliguri', sans-serif" }}
            className="w-full h-64 p-6 bg-transparent text-xl md:text-2xl text-slate-200 placeholder-slate-700 focus:outline-none resize-none leading-loose font-light"
            spellCheck={false}
            aria-label="Main script input area"
          />
          <div className="absolute bottom-4 right-4 text-slate-600 text-sm pointer-events-none">
            {value.length} chars
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TextInput);