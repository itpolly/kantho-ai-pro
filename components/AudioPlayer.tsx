import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Download, Play, Pause, RefreshCw, Volume2 } from 'lucide-react';
import { 
  createWavHeader, 
  decodeBase64, 
  concatenateBuffers, 
  parseMimeType, 
  pcm16ToFloat32 
} from '../utils/audioUtils';
import { WavConversionOptions } from '../types';

interface AudioPlayerProps {
  audioChunks: string[]; // Base64 strings
  mimeType: string | null;
  onReset: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioChunks, mimeType, onReset }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);

  // Initialize Audio Logic when chunks change
  useEffect(() => {
    if (audioChunks.length === 0) return;

    const initAudio = async () => {
      try {
        const rawBuffers = audioChunks.map(decodeBase64);
        const combinedBuffer = concatenateBuffers(rawBuffers);
        
        // Parse options or default to 24kHz
        const options: WavConversionOptions = mimeType 
          ? parseMimeType(mimeType) 
          : { numChannels: 1, sampleRate: 24000, bitsPerSample: 16 };

        // Convert PCM16 to Float32 for Web Audio API
        const float32Data = pcm16ToFloat32(combinedBuffer);

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: options.sampleRate // Force context to match source if possible
        });
        audioContextRef.current = ctx;

        // Create Analyser
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128; // 64 bins
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        const buffer = ctx.createBuffer(options.numChannels, float32Data.length, options.sampleRate);
        buffer.getChannelData(0).set(float32Data);
        
        setAudioBuffer(buffer);
        setDuration(buffer.duration);
        setProgress(0);
        pauseTimeRef.current = 0;
      } catch (e) {
        console.error("Error processing audio", e);
      }
    };

    initAudio();

    return () => {
      stopPlayback();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioChunks, mimeType]);

  // Handle Canvas Resizing
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        // Set actual pixel dimensions to match display dimensions for sharp rendering
        const rect = canvasRef.current.parentElement.getBoundingClientRect();
        canvasRef.current.width = rect.width;
        canvasRef.current.height = rect.height;
      }
    };
    
    window.addEventListener('resize', handleResize);
    // Call once to set initial size
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, [audioChunks]); // Re-run when player appears

  const drawVisualizer = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);

    // Visualizer Settings
    const barCount = 40; 
    const totalWidth = width;
    const barWidth = (totalWidth / barCount) * 0.6; 
    const gap = (totalWidth / barCount) * 0.4;
    
    const gradient = ctx.createLinearGradient(0, height / 2 + 50, 0, height / 2 - 50);
    gradient.addColorStop(0, '#d97706'); // Amber 600
    gradient.addColorStop(0.5, '#f59e0b'); // Amber 500
    gradient.addColorStop(1, '#fbbf24'); // Amber 400

    ctx.fillStyle = gradient;

    for (let i = 0; i < barCount; i++) {
        // Map bar index to frequency bin index
        // We focus on the lower ~75% of the spectrum where voice lives
        const dataIndex = Math.floor((i / barCount) * (bufferLength * 0.75)); 
        const value = dataArray[dataIndex] || 0;
        
        // Scale height relative to canvas height
        const percent = value / 255;
        const barHeight = Math.max(4, height * 0.6 * percent); 
        
        const x = (width - (barCount * (barWidth + gap))) / 2 + i * (barWidth + gap);
        const y = (height - barHeight) / 2; // Center vertically
        
        ctx.beginPath();
        // Use rect if roundRect is not available in some envs, but roundRect is standard now
        if (ctx.roundRect) {
           ctx.roundRect(x, y, barWidth, barHeight, 4);
        } else {
           ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
    }
  }, []);

  const renderLoop = useCallback(() => {
    if (!isPlayingRef.current) return;

    // Update Progress
    if (audioContextRef.current) {
        const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
        const p = Math.min((elapsed / (audioBuffer?.duration || 1)) * 100, 100);
        setProgress(p);
    }
    
    drawVisualizer();

    animationFrameRef.current = requestAnimationFrame(renderLoop);
  }, [audioBuffer, drawVisualizer]);

  const play = useCallback(() => {
    if (!audioContextRef.current || !audioBuffer) return;

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    
    // Connect Chain: Source -> Analyser -> Destination
    if (analyserRef.current) {
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
    } else {
        source.connect(audioContextRef.current.destination);
    }
    
    // Calculate start offset
    const offset = pauseTimeRef.current % audioBuffer.duration;
    source.start(0, offset);
    
    startTimeRef.current = audioContextRef.current.currentTime - offset;
    sourceNodeRef.current = source;
    
    // Update state refs
    isPlayingRef.current = true;
    setIsPlaying(true);

    source.onended = () => {
      // Check if playback ended naturally (close to duration)
      if (audioContextRef.current && 
          Math.abs((audioContextRef.current.currentTime - startTimeRef.current) - audioBuffer.duration) < 0.2) {
          
          isPlayingRef.current = false;
          setIsPlaying(false);
          pauseTimeRef.current = 0;
          setProgress(100);
          cancelAnimationFrame(animationFrameRef.current);
          
          // Clear visualizer
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
      }
    };

    renderLoop();

  }, [audioBuffer, renderLoop]);

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        if (audioContextRef.current) {
            pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
        }
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceNodeRef.current = null;
    }
    cancelAnimationFrame(animationFrameRef.current);
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      // If finished, restart
      if (progress >= 100) {
        pauseTimeRef.current = 0;
        setProgress(0);
      }
      play();
    }
  };

  const handleDownload = () => {
    if (audioChunks.length === 0) return;
    
    const rawBuffers = audioChunks.map(decodeBase64);
    const combinedBuffer = concatenateBuffers(rawBuffers);
    const options: WavConversionOptions = mimeType 
          ? parseMimeType(mimeType) 
          : { numChannels: 1, sampleRate: 24000, bitsPerSample: 16 };
          
    const header = createWavHeader(combinedBuffer.length, options);
    const wavFile = new Uint8Array(header.length + combinedBuffer.length);
    wavFile.set(header);
    wavFile.set(combinedBuffer, header.length);

    const blob = new Blob([wavFile], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kontho-ai-${Date.now()}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!audioBuffer) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 animate-fade-in-up">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl relative overflow-hidden">
        {/* Real-time Visualizer Canvas */}
        <canvas 
            ref={canvasRef}
            className="absolute inset-0 w-full h-full opacity-30 pointer-events-none"
        />

        <div className="relative z-10 flex flex-col items-center">
           {/* Progress Bar */}
           <div className="w-full h-2 bg-slate-800 rounded-full mb-8 overflow-hidden cursor-pointer">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
           </div>

           <div className="flex items-center justify-between w-full px-4 md:px-12">
             <div className="text-slate-400 font-mono text-sm">
               {formatTime((progress / 100) * duration)}
             </div>

             <div className="flex items-center gap-6">
                <button 
                  onClick={onReset}
                  className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                  title="New Generation"
                >
                  <RefreshCw size={24} />
                </button>

                <button 
                  onClick={togglePlay}
                  className="p-6 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-full shadow-lg hover:shadow-amber-500/20 transition-all transform hover:scale-105"
                >
                  {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                </button>

                <button 
                  onClick={handleDownload}
                  className="p-3 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-full transition-colors"
                  title="Download WAV"
                >
                  <Download size={24} />
                </button>
             </div>

             <div className="text-slate-400 font-mono text-sm">
               {formatTime(duration)}
             </div>
           </div>
           
           <div className="mt-6 flex items-center space-x-2 text-slate-500 text-xs uppercase tracking-widest">
             <Volume2 size={12} />
             <span>Studio Quality • 24kHz PCM</span>
           </div>
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default AudioPlayer;