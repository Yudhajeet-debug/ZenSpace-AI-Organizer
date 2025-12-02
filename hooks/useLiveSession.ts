import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to convert Float32Array to 16-bit PCM
function createBlob(data: Float32Array): { data: string, mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  
  // Manual base64 encoding for the blob data
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Data = btoa(binary);

  return {
    data: base64Data,
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Helper to decode base64 to ArrayBuffer
function decodeAudio(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const useLiveSession = (videoRef: React.RefObject<HTMLVideoElement>) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Ref to expose analyser to UI components
  const volumeAnalyserRef = useRef<AnalyserNode | null>(null);

  const connect = useCallback(async () => {
    if (isConnected) return;

    try {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }

      // 1. Setup Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Setup Analyser for visualization
      const analyser = outputAudioContextRef.current.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;
      volumeAnalyserRef.current = analyser;
      
      // Connect analyser to destination
      analyser.connect(outputAudioContextRef.current.destination);

      // 2. Get User Media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // 3. Connect to Live API
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log("Live Session Opened");
            setIsConnected(true);
            setIsStreaming(true);

            // Start Audio Streaming
            if (inputAudioContextRef.current && streamRef.current) {
                const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
                const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                
                scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                    const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                    const pcmBlob = createBlob(inputData);
                    
                    if (sessionPromiseRef.current) {
                        sessionPromiseRef.current.then((session: any) => {
                             session.sendRealtimeInput({ media: pcmBlob });
                        });
                    }
                };
                
                source.connect(scriptProcessor);
                scriptProcessor.connect(inputAudioContextRef.current.destination);
            }

            // Start Video Streaming
            if (videoRef.current && canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                videoIntervalRef.current = window.setInterval(() => {
                    const videoEl = videoRef.current;
                    const canvasEl = canvasRef.current;
                    
                    if (videoEl && canvasEl && ctx) {
                        canvasEl.width = videoEl.videoWidth * 0.25; // Scale down for performance
                        canvasEl.height = videoEl.videoHeight * 0.25;
                        ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
                        
                        const base64 = canvasEl.toDataURL('image/jpeg', 0.5).split(',')[1];
                         if (sessionPromiseRef.current) {
                            sessionPromiseRef.current.then((session: any) => {
                                session.sendRealtimeInput({
                                    media: { data: base64, mimeType: 'image/jpeg' }
                                });
                            });
                        }
                    }
                }, 1000); // 1 FPS
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current && volumeAnalyserRef.current) {
                const ctx = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                const audioBytes = decodeAudio(base64Audio);
                const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                // Connect source to analyser, which is already connected to destination
                source.connect(volumeAnalyserRef.current);
                source.start(nextStartTimeRef.current);
                
                nextStartTimeRef.current += audioBuffer.duration;
            }
          },
          onclose: () => {
            console.log("Live Session Closed");
            setIsConnected(false);
            setIsStreaming(false);
          },
          onerror: (err) => {
            console.error("Live Session Error", err);
            setIsConnected(false);
            setIsStreaming(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: "You are a friendly, energetic professional organizer. You are seeing the user's room through their camera. Give encouraging, practical decluttering advice. Suggest specific items to pick up or move. Be concise.",
        },
      });

    } catch (e) {
      console.error("Failed to connect", e);
      setIsConnected(false);
    }
  }, [isConnected, videoRef]);

  const disconnect = useCallback(async () => {
    if (sessionPromiseRef.current) {
        const session = await sessionPromiseRef.current;
        session.close();
    }
    
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }

    if (videoIntervalRef.current) {
        clearInterval(videoIntervalRef.current);
        videoIntervalRef.current = null;
    }
    
    if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }
    
    if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }

    setIsConnected(false);
    setIsStreaming(false);
    sessionPromiseRef.current = null;
  }, []);

  return { isConnected, isStreaming, connect, disconnect, volumeAnalyser: volumeAnalyserRef };
};