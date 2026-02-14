
import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { CORE_INSTRUCTIONS } from '../constants';
import { VoiceLinkSettings } from '../types';

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
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

export interface LiveCallbacks {
  onTranscription: (text: string, role: 'user' | 'assistant') => void;
  onTurnComplete: (userText: string, assistantText: string) => void;
  onLog: (msg: string, type?: 'info' | 'error' | 'success') => void;
  onStateChange: (active: boolean) => void;
}

export const useGeminiLive = (callbacks: LiveCallbacks) => {
  const [isActive, setIsActive] = useState(false);
  const sessionRef = useRef<Promise<any> | null>(null);
  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext; scriptProcessor?: ScriptProcessorNode; stream?: MediaStream } | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isStoppingRef = useRef(false);
  
  const currentInputRef = useRef('');
  const currentOutputRef = useRef('');

  const stop = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    try {
      // 1. Handle Session Closing
      const currentSessionPromise = sessionRef.current;
      sessionRef.current = null; 
      if (currentSessionPromise) {
        try {
          const session = await currentSessionPromise;
          if (session && typeof session.close === 'function') {
            session.close();
          }
        } catch (e) {
          console.debug('Failed to close session gracefully:', e);
        }
      }
      
      // 2. Handle Audio Resources Cleanup
      const contexts = audioContextsRef.current;
      audioContextsRef.current = null; 
      
      if (contexts) {
        // Disconnect audio processing nodes
        if (contexts.scriptProcessor) {
          try {
            contexts.scriptProcessor.disconnect();
            contexts.scriptProcessor.onaudioprocess = null;
          } catch(e) {}
        }

        // Stop all active tracks
        if (contexts.stream) {
          try {
            contexts.stream.getTracks().forEach(track => {
              if (track) track.stop();
            });
          } catch(e) {}
        }

        // Close AudioContexts
        if (contexts.input && typeof contexts.input.close === 'function' && contexts.input.state !== 'closed') {
          try { await contexts.input.close(); } catch (e) {}
        }
        
        if (contexts.output && typeof contexts.output.close === 'function' && contexts.output.state !== 'closed') {
          try { await contexts.output.close(); } catch (e) {}
        }
      }

      // 3. Clear all playing audio sources
      sourcesRef.current.forEach(s => {
        try {
          s.stop();
          s.disconnect();
        } catch(e) {}
      });
      sourcesRef.current.clear();
      nextStartTimeRef.current = 0;

      // 4. Reset UI State
      setIsActive(false);
      callbacks.onStateChange(false);
      callbacks.onLog("Voice Link disconnected.");
      
      currentInputRef.current = '';
      currentOutputRef.current = '';
    } catch (err) {
      console.error('Error during voice link disconnect:', err);
    } finally {
      isStoppingRef.current = false;
    }
  }, [callbacks]);

  const start = useCallback(async (settings: VoiceLinkSettings) => {
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      
      // Ensure existing sessions are fully cleared
      await stop();
      
      const ai = new GoogleGenAI({ apiKey });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextsRef.current = { input: inputCtx, output: outputCtx, stream };

      let modeInstruction = "";
      let thinkingConfig = undefined;
      let temperature = 0.7;

      if (settings.mode === 'translator') {
        modeInstruction = "\nMODE: TRANSLATOR. Focus exclusively on deep-reasoning, high-accuracy translation between languages. Maintain the nuance and sentiment perfectly.";
        // Prioritize accuracy over speed as requested: add thinking budget and lower temperature
        thinkingConfig = { thinkingBudget: 4096 };
        temperature = 0.1;
      }
      if (settings.mode === 'crisis_support') {
        modeInstruction = "\nMODE: CRISIS SUPPORT. Be deeply empathetic, slow, clear, and prioritize safety protocols.";
      }

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            if (isStoppingRef.current) return;
            
            setIsActive(true);
            callbacks.onStateChange(true);
            callbacks.onLog(`Voice Link established: ${settings.voice}`, 'success');
            
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            if (audioContextsRef.current) {
              audioContextsRef.current.scriptProcessor = scriptProcessor;
            }
            
            scriptProcessor.onaudioprocess = (e) => {
              // Safety check: don't send data if we are stopping or session is gone
              if (isStoppingRef.current || !audioContextsRef.current) return;

              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then((session) => {
                if (!isStoppingRef.current && session && typeof session.sendRealtimeInput === 'function') {
                  try {
                    session.sendRealtimeInput({ media: pcmBlob });
                  } catch (err) {
                    console.debug('Failed to send realtime input:', err);
                  }
                }
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (isStoppingRef.current) return;

            // Handle Input Transcription (User speaking)
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentInputRef.current += text;
              callbacks.onTranscription(currentInputRef.current, 'user');
            }
            
            // Handle Output Transcription (Assistant speaking)
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentOutputRef.current += text;
              callbacks.onTranscription(currentOutputRef.current, 'assistant');
            }

            // Handle Audio Data
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextsRef.current?.output) {
              const { output: ctx } = audioContextsRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              try {
                const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                source.addEventListener('ended', () => sourcesRef.current.delete(source));
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
              } catch (e) {
                console.debug('Audio decoding/playback error:', e);
              }
            }

            // Handle Turn Completion
            if (message.serverContent?.turnComplete) {
              const finalInput = currentInputRef.current;
              const finalOutput = currentOutputRef.current;
              callbacks.onTurnComplete(finalInput, finalOutput);
              currentInputRef.current = '';
              currentOutputRef.current = '';
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { 
                try { s.stop(); s.disconnect(); } catch(e) {} 
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            callbacks.onLog("Session sync error.", 'error');
            stop();
          },
          onclose: () => {
            stop();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: CORE_INSTRUCTIONS + modeInstruction,
          temperature,
          thinkingConfig,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.voice } }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        }
      });

      sessionRef.current = sessionPromise;
    } catch (err: any) {
      callbacks.onLog(`Uplink failed: ${err.message}`, 'error');
      stop();
    }
  }, [callbacks, stop]);

  return { start, stop, isActive };
};
