
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, PhoneOff, Activity, Volume2, User, Bot, Loader2 } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { float32ToPcm16, pcm16ToFloat32, encodeBase64, decodeBase64 } from '../utils/audioUtils';
import { getEffectiveApiKey, getSettings } from '../utils/storageUtils';

interface LiveInterfaceProps {
  onClose: () => void;
}

const LiveInterface: React.FC<LiveInterfaceProps> = ({ onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [volumeLevel, setVolumeLevel] = useState(0); // 0-100
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorDetails, setErrorDetails] = useState<string>("");
  
  // Refs for Audio Contexts and Session
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const audioWorkletNodeRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null); // Store the promise
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const playAudioChunk = useCallback(async (base64Audio: string) => {
    if (!outputContextRef.current) return;
    const ctx = outputContextRef.current;

    try {
      const pcmData = decodeBase64(base64Audio);
      const float32Data = pcm16ToFloat32(pcmData);
      
      const buffer = ctx.createBuffer(1, float32Data.length, 24000); 
      buffer.getChannelData(0).set(float32Data);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      
      const now = ctx.currentTime;
      const startTime = Math.max(now, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + buffer.duration;

      source.onended = () => {
        sourcesRef.current.delete(source);
      };
      sourcesRef.current.add(source);

    } catch (e) {
      console.error("Error decoding/playing audio chunk", e);
    }
  }, []);

  const connectToLive = async () => {
    setStatus('connecting');
    setErrorDetails("");
    
    try {
      const apiKey = getEffectiveApiKey();
      if (!apiKey) throw new Error("GenAI Key is missing. Please ensure process.env.API_KEY is configured.");
      
      const settings = getSettings();
      const model = settings.models.live;
      const ai = new GoogleGenAI({ apiKey });

      // 1. Setup Audio Input
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      }});
      streamRef.current = stream;
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      audioWorkletNodeRef.current = processor;

      source.connect(processor);
      processor.connect(audioCtx.destination); 

      // 2. Setup Audio Output
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputContextRef.current = outCtx;

      // 3. Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: 'You are Kontho-AI, a helpful Bengali voice assistant. Start every conversation with "Assalamu Alaikum" (আসসালামু আলাইকুম). Speak in standard Bengali (Shuddho Bangla). Be polite, warm, and helpful.',
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          }
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            setStatus('connected');
            setIsConnected(true);
            
            processor.onaudioprocess = (e) => {
              if (!isMicOn) return;
              
              const inputData = e.inputBuffer.getChannelData(0);
              
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolumeLevel(Math.min(100, rms * 400));

              const pcm16 = float32ToPcm16(inputData);
              const base64Audio = encodeBase64(new Uint8Array(pcm16.buffer));

              sessionPromiseRef.current?.then(session => { // Use sessionPromiseRef
                const pcmBlob = {
                  data: base64Audio,
                  mimeType: 'audio/pcm;rate=16000',
                };
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              await playAudioChunk(audioData);
            }

            if (msg.serverContent?.interrupted) {
               sourcesRef.current.forEach(s => s.stop());
               sourcesRef.current.clear();
               nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            console.log("Session Closed");
            disconnect();
          },
          onerror: (err) => {
            console.error("Session Error", err);
            setStatus('error');
            setErrorDetails("Connection error. Check GenAI Key or Quota.");
            disconnect();
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise; // Store the promise

    } catch (e: any) {
      console.error("Connection Failed", e);
      setStatus('error');
      setErrorDetails(e.message || "Failed to connect to microphone or GenAI service.");
    }
  };

  const disconnect = () => {
    if (sessionPromiseRef.current) { // Use sessionPromiseRef
       sessionPromiseRef.current.then((s: any) => {
         if (s.close) s.close();
       }).catch(() => {});
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (inputContextRef.current) inputContextRef.current.close();
    if (outputContextRef.current) outputContextRef.current.close();
    if (audioWorkletNodeRef.current) audioWorkletNodeRef.current.disconnect();

    setIsConnected(false);
    setStatus('idle');
    setVolumeLevel(0);
  };

  useEffect(() => {
    return () => disconnect();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col h-[600px] relative">
        
        {/* Header */}
        <div className="bg-slate-800/50 p-4 flex justify-between items-center border-b border-slate-800">
           <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
             <span className="font-bold text-slate-200">Kontho Live (Bengali)</span>
           </div>
           <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close live conversation"><Activity size={20} /></button>
        </div>

        {/* Visualizer Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative p-8 gap-8">
           
           <div className={`
             w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 relative
             ${isConnected ? 'bg-amber-500/10 shadow-[0_0_50px_rgba(245,158,11,0.2)]' : 'bg-slate-800'}
           `}>
             <div className={`
               absolute inset-0 rounded-full border-2 border-amber-500/30
               ${isConnected ? 'animate-ping opacity-20' : 'hidden'}
             `} />
             <Bot size={64} className={isConnected ? "text-amber-500" : "text-slate-600"} aria-hidden="true" />
           </div>

           <div className="text-center space-y-2">
              <h2 className={`text-2xl font-light ${status === 'error' ? 'text-red-400' : 'text-slate-100'}`} aria-live="polite">
                {status === 'connecting' && "Connecting..."}
                {status === 'connected' && "Listening..."}
                {status === 'idle' && "Ready to Chat"}
                {status === 'error' && "Connection Failed"}
              </h2>
              <p className="text-sm text-slate-500 max-w-[250px] mx-auto" aria-live="polite">
                 {status === 'error' ? errorDetails : (status === 'connected' ? "Speak naturally in Bengali" : "Start a real-time conversation")}
              </p>
           </div>
        </div>

        {/* Controls */}
        <div className="bg-slate-950 p-6 pb-8 border-t border-slate-800">
           {status === 'idle' || status === 'error' ? (
             <button 
               onClick={connectToLive}
               disabled={status === 'connecting'}
               className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all"
               aria-label="Start conversation"
             >
               {status === 'connecting' ? <Loader2 className="animate-spin" /> : <Mic size={24} />}
               Start Conversation
             </button>
           ) : (
             <div className="flex items-center justify-center gap-6">
                <button 
                   onClick={() => setIsMicOn(!isMicOn)}
                   className={`p-4 rounded-full transition-all ${isMicOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-500/20 text-red-500'}`}
                   aria-label={isMicOn ? "Mute microphone" : "Unmute microphone"}
                >
                   {isMicOn ? <Mic size={28} /> : <MicOff size={28} />}
                </button>
                
                <div className="h-16 w-32 bg-slate-900 rounded-xl flex items-center justify-center gap-1 overflow-hidden border border-slate-800" aria-label="Microphone volume level indicator">
                   {[1,2,3,4,5].map(i => (
                     <div 
                       key={i} 
                       className="w-2 bg-amber-500 rounded-full transition-all duration-75" 
                       style={{ height: `${Math.max(4, volumeLevel * Math.random() + 10)}%` }} 
                       aria-hidden="true"
                     />
                   ))}
                </div>

                <button 
                   onClick={disconnect}
                   className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-full shadow-lg transition-all"
                   aria-label="End conversation"
                >
                   <PhoneOff size={28} />
                </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default LiveInterface;