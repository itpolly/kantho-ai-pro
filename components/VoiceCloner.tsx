
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Upload, X, Wand2, Play, Pause, Loader2, Check, Sliders, User, Music, Activity, RefreshCw, Volume2 } from 'lucide-react';
import { analyzeReferenceAudio, generateSpeechStream } from '../services/geminiService';
import { PersonaPreset, VoiceName } from '../types';
import { decodeBase64, concatenateBuffers, createWavHeader } from '../utils/audioUtils';

interface VoiceClonerProps {
  onClose: () => void;
  onCloneSuccess: (preset: PersonaPreset) => void;
}

interface FineTuningState {
  pitch: string;
  age: string;
  style: string;
}

const PITCH_OPTIONS = ['Deep / Low', 'Natural', 'High / Soft'];
const AGE_OPTIONS = ['Young Adult', 'Middle Aged', 'Senior'];

const VoiceCloner: React.FC<VoiceClonerProps> = ({ onClose, onCloneSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  
  // Clone Result State
  const [cloneResult, setCloneResult] = useState<{
    name: string;
    description: string;
    baseVoice: VoiceName;
    instruction: string;
  } | null>(null);

  // Fine Tuning State
  const [fineTuning, setFineTuning] = useState<FineTuningState>({
    pitch: 'Natural',
    age: 'Middle Aged',
    style: ''
  });

  // Preview Generation State
  const [isPreviewGenerating, setIsPreviewGenerating] = useState(false);
  const [generatedPreviewUrl, setGeneratedPreviewUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const uploadAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 5 * 1024 * 1024) {
        alert("File too large. Please upload a sample under 5MB.");
        return;
      }
      setFile(selectedFile);
      setUploadPreviewUrl(URL.createObjectURL(selectedFile));
      setCloneResult(null);
      setGeneratedPreviewUrl(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const content = base64Data.split(',')[1];
        const mimeType = file.type || 'audio/wav';

        const result = await analyzeReferenceAudio(content, mimeType);
        
        setCloneResult({
          name: `Cloned: ${result.description}`,
          description: result.description,
          baseVoice: result.baseVoice,
          instruction: result.instruction
        });
        
        // Infer initial fine-tuning from description if possible, else default
        setFineTuning({
          pitch: 'Natural',
          age: 'Middle Aged',
          style: ''
        });
      };
    } catch (e) {
      console.error(e);
      alert("Failed to analyze voice. Please try a clearer audio sample.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGeneratePreview = async () => {
    if (!cloneResult) return;
    setIsPreviewGenerating(true);
    setGeneratedPreviewUrl(null);

    const modifiers = `
### FINE-TUNING OVERRIDE:
- Pitch/Tone: ${fineTuning.pitch}
- Apparent Age: ${fineTuning.age}
- Specific Style: ${fineTuning.style || 'None'}
`;
    const fullInstruction = cloneResult.instruction + modifiers;
    const previewText = "আসসালামু আলাইকুম। এটি আপনার কাস্টম ভয়েস ক্লোনের একটি প্রিভিউ।"; // Bengali: "Assalamu Alaikum. This is a preview of your custom voice clone."

    try {
      const stream = await generateSpeechStream({
        text: previewText,
        voiceConfig: {
          mode: 'single',
          primaryVoice: cloneResult.baseVoice,
          secondaryVoice: VoiceName.Zephyr, // Dummy
          pacing: 'Natural',
          emotion: 'Neutral'
        },
        systemInstruction: fullInstruction
      });

      const chunks: string[] = [];
      for await (const chunk of stream) {
        if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
          chunks.push(chunk.candidates[0].content.parts[0].inlineData.data);
        }
      }

      if (chunks.length > 0) {
        const rawBuffers = chunks.map(decodeBase64);
        const combined = concatenateBuffers(rawBuffers);
        const header = createWavHeader(combined.length, { numChannels: 1, sampleRate: 24000, bitsPerSample: 16 });
        const wav = new Uint8Array(header.length + combined.length);
        wav.set(header);
        wav.set(combined, header.length);
        
        const blob = new Blob([wav], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setGeneratedPreviewUrl(url);
      }
    } catch (e) {
      console.error("Preview generation failed", e);
      alert("Could not generate preview.");
    } finally {
      setIsPreviewGenerating(false);
    }
  };

  const handleSave = () => {
    if (!cloneResult) return;

    const modifiers = `
### FINE-TUNING OVERRIDE:
- Pitch/Tone: ${fineTuning.pitch}
- Apparent Age: ${fineTuning.age}
- Specific Style: ${fineTuning.style || 'None'}
`;
    const finalInstruction = cloneResult.instruction + modifiers;

    const newPreset: PersonaPreset = {
      id: `cloned_${Date.now()}`,
      name: cloneResult.name,
      instruction: finalInstruction,
      sampleText: "",
      isDefault: false,
      baseVoice: cloneResult.baseVoice
    };

    onCloneSuccess(newPreset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-800/50 p-5 border-b border-slate-700 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
              <Wand2 size={24} aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-bold text-xl font-display text-slate-100">Voice Lab</h3>
              <p className="text-xs text-slate-400">Clone, Fine-Tune, and Create Custom Personas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors" aria-label="Close Voice Lab">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 md:p-8">
          {!cloneResult ? (
            /* PHASE 1: UPLOAD */
            <div className="flex flex-col items-center justify-center py-10 space-y-8 max-w-lg mx-auto">
               <div className="text-center space-y-3">
                <h4 className="text-2xl font-bold text-slate-200">Upload Reference Audio</h4>
                <p className="text-slate-400">Upload a clear 10-30s recording of the voice you wish to clone. We'll analyze the prosody, accent, and timbre.</p>
              </div>

              <div className="w-full">
                <div className={`
                  border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-6 transition-all duration-300
                  ${file ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-700 hover:border-slate-600 bg-slate-950'}
                `}>
                  {file ? (
                     <div className="flex flex-col items-center gap-4 w-full">
                        <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                          <Activity size={32} aria-hidden="true" />
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-lg text-slate-200">{file.name}</p>
                          <p className="text-sm text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        
                        {uploadPreviewUrl && (
                          <div className="w-full bg-slate-900 rounded-lg p-3 flex items-center gap-3 border border-slate-800 mt-2">
                             <button 
                               onClick={() => {
                                 if (uploadAudioRef.current) {
                                   if (uploadAudioRef.current.paused) uploadAudioRef.current.play();
                                   else uploadAudioRef.current.pause();
                                 }
                               }}
                               className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-amber-500 transition-colors"
                               aria-label="Play uploaded audio"
                             >
                               <Play size={16} fill="currentColor" />
                             </button>
                             <div className="h-1 bg-slate-800 rounded-full flex-1 overflow-hidden" aria-hidden="true">
                               <div className="h-full w-1/2 bg-slate-600"></div>
                             </div>
                             <audio ref={uploadAudioRef} src={uploadPreviewUrl} className="hidden" />
                          </div>
                        )}
                        
                        <button 
                          onClick={() => { setFile(null); setUploadPreviewUrl(null); }}
                          className="text-sm text-red-400 hover:text-red-300 font-medium py-2"
                          aria-label="Change uploaded audio file"
                        >
                          Change File
                        </button>
                     </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 group-hover:scale-110 transition-transform">
                        <Upload size={32} aria-hidden="true" />
                      </div>
                      <label className="cursor-pointer group">
                        <span className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg border border-slate-700 group-hover:border-amber-500/50">
                          Select Audio File
                        </span>
                        <input type="file" className="hidden" accept="audio/*" onChange={handleFileChange} aria-label="Upload audio file" />
                      </label>
                      <p className="text-xs text-slate-500">Supported: MP3, WAV (Max 5MB)</p>
                    </>
                  )}
                </div>
              </div>

              <button
                disabled={!file || isAnalyzing}
                onClick={handleAnalyze}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg ${
                  !file 
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-500 hover:to-orange-500 hover:shadow-amber-500/20 hover:scale-[1.01]'
                }`}
                aria-label={isAnalyzing ? "Analyzing voice" : "Analyze and clone voice"}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="animate-spin" size={24} aria-hidden="true" />
                    <span>Analyzing Voice DNA...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={24} aria-hidden="true" />
                    <span>Analyze & Clone</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* PHASE 2: FINE TUNE */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up">
              
              {/* Left Column: Analysis Results */}
              <div className="space-y-6">
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-6 space-y-4">
                  <h4 className="text-slate-400 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Activity size={16} aria-hidden="true" />
                    Analysis Results
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-500">Detected Profile</label>
                      <div className="text-xl font-medium text-slate-200 mt-1">{cloneResult.description}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                         <label className="text-xs text-slate-500">Base Model</label>
                         <div className="text-amber-500 font-mono mt-1">{cloneResult.baseVoice}</div>
                       </div>
                       <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                         <label className="text-xs text-slate-500">Confidence</label>
                         <div className="text-green-500 font-mono mt-1">High</div>
                       </div>
                    </div>

                    <div>
                       <label className="text-xs text-slate-500">Original Instructions</label>
                       <textarea 
                          readOnly
                          value={cloneResult.instruction}
                          className="w-full h-24 bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-400 mt-2 resize-none focus:outline-none"
                          aria-label="Original instructions from voice analysis"
                       />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-800/50">
                  <h4 className="text-slate-200 font-medium mb-2">Naming your Persona</h4>
                  <input 
                    type="text" 
                    value={cloneResult.name}
                    onChange={(e) => setCloneResult(prev => prev ? {...prev, name: e.target.value} : null)}
                    placeholder="Enter voice name..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                    aria-label="Name for your custom voice persona"
                  />
                </div>
              </div>

              {/* Right Column: Fine Tuning Studio */}
              <div className="space-y-6">
                 <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" aria-hidden="true"></div>
                    
                    <h4 className="text-amber-500 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                      <Sliders size={16} aria-hidden="true" />
                      Fine-Tuning Studio
                    </h4>

                    {/* Controls */}
                    <div className="space-y-5">
                       
                       {/* Pitch Control */}
                       <div className="space-y-2">
                         <div className="flex justify-between">
                            <label className="text-sm text-slate-300 flex items-center gap-2">
                              <Music size={14} className="text-slate-500" aria-hidden="true" /> Pitch & Tone
                            </label>
                            <span className="text-xs text-amber-500/80" aria-live="polite">{fineTuning.pitch}</span>
                         </div>
                         <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800" role="radiogroup" aria-label="Select pitch and tone">
                           {PITCH_OPTIONS.map((opt) => (
                             <button
                               key={opt}
                               onClick={() => setFineTuning({...fineTuning, pitch: opt})}
                               className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                                 fineTuning.pitch === opt 
                                   ? 'bg-slate-800 text-amber-500 shadow-sm border border-slate-700' 
                                   : 'text-slate-500 hover:text-slate-300'
                               }`}
                               role="radio"
                               aria-checked={fineTuning.pitch === opt}
                               aria-label={`Set pitch to ${opt}`}
                             >
                               {opt}
                             </button>
                           ))}
                         </div>
                       </div>

                       {/* Age Control */}
                       <div className="space-y-2">
                         <div className="flex justify-between">
                            <label className="text-sm text-slate-300 flex items-center gap-2">
                              <User size={14} className="text-slate-500" aria-hidden="true" /> Apparent Age
                            </label>
                            <span className="text-xs text-amber-500/80" aria-live="polite">{fineTuning.age}</span>
                         </div>
                         <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800" role="radiogroup" aria-label="Select apparent age">
                           {AGE_OPTIONS.map((opt) => (
                             <button
                               key={opt}
                               onClick={() => setFineTuning({...fineTuning, age: opt})}
                               className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                                 fineTuning.age === opt 
                                   ? 'bg-slate-800 text-amber-500 shadow-sm border border-slate-700' 
                                   : 'text-slate-500 hover:text-slate-300'
                               }`}
                               role="radio"
                               aria-checked={fineTuning.age === opt}
                               aria-label={`Set age to ${opt}`}
                             >
                               {opt}
                             </button>
                           ))}
                         </div>
                       </div>

                       {/* Style Input */}
                       <div className="space-y-2">
                          <label htmlFor="style-nuances-input" className="text-sm text-slate-300">Style Nuances (Optional)</label>
                          <input 
                            id="style-nuances-input"
                            type="text"
                            value={fineTuning.style}
                            onChange={(e) => setFineTuning({...fineTuning, style: e.target.value})}
                            placeholder="e.g. Raspy, Whispery, British Accent..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-amber-500 outline-none"
                            aria-label="Optional style nuances for the voice"
                          />
                       </div>
                    </div>

                    {/* Preview Section */}
                    <div className="pt-4 border-t border-slate-800">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-bold text-slate-500 uppercase">Audio Preview</label>
                        {generatedPreviewUrl && (
                          <span className="text-[10px] text-green-500 flex items-center gap-1">
                            <Check size={10} aria-hidden="true" /> Ready
                          </span>
                        )}
                      </div>
                      
                      <div className="flex gap-3">
                        <button 
                          onClick={handleGeneratePreview}
                          disabled={isPreviewGenerating}
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                          aria-label={isPreviewGenerating ? "Generating sample" : "Generate sample audio"}
                        >
                          {isPreviewGenerating ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
                          Generate Sample
                        </button>

                        <button 
                          disabled={!generatedPreviewUrl}
                          onClick={() => {
                             if (previewAudioRef.current) {
                               if (isPlayingPreview) {
                                 previewAudioRef.current.pause();
                               } else {
                                 previewAudioRef.current.currentTime = 0;
                                 previewAudioRef.current.play();
                               }
                             }
                          }}
                          className={`
                            w-12 h-10 rounded-lg flex items-center justify-center transition-all
                            ${generatedPreviewUrl 
                               ? 'bg-amber-500 text-slate-900 hover:bg-amber-400 cursor-pointer shadow-lg' 
                               : 'bg-slate-800 text-slate-600 cursor-not-allowed'}
                          `}
                          aria-label={isPlayingPreview ? "Pause preview audio" : "Play preview audio"}
                        >
                          {isPlayingPreview ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                        </button>
                        <audio 
                           ref={previewAudioRef} 
                           src={generatedPreviewUrl || undefined} 
                           onPlay={() => setIsPlayingPreview(true)}
                           onPause={() => setIsPlayingPreview(false)}
                           onEnded={() => setIsPlayingPreview(false)}
                           aria-hidden="true"
                        />
                      </div>
                    </div>
                 </div>

                 {/* Action Buttons */}
                 <div className="flex gap-4">
                    <button 
                      onClick={() => setCloneResult(null)}
                      className="flex-1 py-3.5 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 font-medium transition-all"
                      aria-label="Go back to audio upload"
                    >
                      Back
                    </button>
                    <button 
                      onClick={handleSave}
                      className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                      aria-label="Save custom voice persona"
                    >
                      <Check size={18} aria-hidden="true" />
                      Save Custom Voice
                    </button>
                 </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceCloner;