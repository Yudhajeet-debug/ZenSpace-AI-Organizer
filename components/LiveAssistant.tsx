import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { useLiveSession } from '../hooks/useLiveSession';

const LiveAssistant: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isConnected, isStreaming, connect, disconnect, volumeAnalyser } = useLiveSession(videoRef);

  useEffect(() => {
    // Auto-connect on mount for "Live Button" experience
    connect();
    return () => {
        disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Audio Visualizer Loop
  useEffect(() => {
    let animationFrameId: number;
    
    const renderVisualizer = () => {
      const canvas = canvasRef.current;
      const analyser = volumeAnalyser.current;
      
      if (canvas && analyser && isConnected) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyser.getByteFrequencyData(dataArray);

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw subtle frequency bars at the bottom
          const barWidth = (canvas.width / bufferLength) * 2.5;
          let barHeight;
          let x = 0;

          // Gradient for bars
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - 100);
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.8)'); // Emerald
          gradient.addColorStop(1, 'rgba(52, 211, 153, 0.0)'); // Transparent

          ctx.fillStyle = gradient;

          for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2; // Scale down
            // Mirror effect from center can look cool, but simple bottom-up is fine
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
          }
        }
      }
      animationFrameId = requestAnimationFrame(renderVisualizer);
    };

    renderVisualizer();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isConnected, volumeAnalyser]);

  return (
    <div className="h-full flex flex-col bg-black rounded-2xl overflow-hidden relative">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="w-full h-full object-cover opacity-90"
      />
      
      {/* Audio Visualizer Overlay */}
      <canvas 
        ref={canvasRef} 
        className="absolute bottom-0 left-0 w-full h-32 pointer-events-none z-10 opacity-60"
        width={600}
        height={150}
      />

      {/* Overlay UI */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 z-20 bg-gradient-to-b from-black/40 via-transparent to-black/60">
        
        {/* Status Header */}
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-white text-xs font-medium tracking-wide">
                    {isConnected ? 'LIVE ASSISTANT' : 'CONNECTING...'}
                </span>
            </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center gap-6 mb-4">
            <div className="flex flex-col items-center gap-2">
                 <button className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
                    <Mic className="w-6 h-6" />
                 </button>
                 <span className="text-white/60 text-xs">Mute</span>
            </div>

             {/* End Call Button */}
            <div className="flex flex-col items-center gap-2">
                 <button 
                    onClick={disconnect}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 flex items-center justify-center text-white transition-all transform hover:scale-105"
                 >
                    <PhoneOff className="w-8 h-8" />
                 </button>
                 <span className="text-white/60 text-xs">End</span>
            </div>

            <div className="flex flex-col items-center gap-2">
                 <button className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all">
                    <Video className="w-6 h-6" />
                 </button>
                 <span className="text-white/60 text-xs">Cam</span>
            </div>
        </div>
      </div>

      {/* Connection Loader */}
      {!isConnected && (
         <div className="absolute inset-0 flex items-center justify-center bg-stone-900 z-30">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="text-stone-400 text-sm">Connecting to ZenSpace Live...</p>
            </div>
         </div>
      )}
    </div>
  );
};

export default LiveAssistant;