
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { CORE_INSTRUCTIONS } from "../constants.tsx";
import { ModelTier, UserTier } from "../types";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const detectTamil = (text: string): boolean => /[\u0B80-\u0BFF]/.test(text);
export const detectArabicScript = (text: string): boolean => /[\u0600-\u06FF]/.test(text);
export const detectBurmese = (text: string): boolean => /[\u1000-\u109F]/.test(text);

export const detectMalayIndonesian = (text: string): boolean => {
  const keywords = /\b(selamat|pagi|siang|malam|halo|apa|kabar|terima|kasih|saya|kamu|anda|makan|minum|bantuan|tolong|dengan|yang|untuk|adalah|bisa|boleh)\b/i;
  return keywords.test(text);
};

export const sendMessage = async (
  message: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  tier: ModelTier = 'gemini-2.5-flash-lite',
  userTier: UserTier = 'free',
  media?: { data: string, mimeType: string },
  location?: { latitude: number, longitude: number }
) => {
  const ai = getAIClient();
  
  const isTamil = detectTamil(message);
  const isArabicScript = detectArabicScript(message);
  const isBurmese = detectBurmese(message);
  const isMalayIndo = detectMalayIndonesian(message);
  
  let languageHint = "";
  if (isTamil) languageHint = "\n(Context: User is speaking Tamil. Respond in Tamil.)";
  else if (isArabicScript) languageHint = "\n(Context: User is using Arabic/Rohingya script. Respond in Rohingya.)";
  else if (isBurmese) languageHint = "\n(Context: User is speaking Burmese. Respond in Burmese.)";
  else if (isMalayIndo) languageHint = "\n(Context: User is speaking Malay/Indonesian. Respond appropriately.)";
  else languageHint = "\n(Context: Detect the user's country and language automatically. Respond in their native language with high empathy.)";

  // Enforce tier limits in system instruction
  const tierContext = `\n[TIER INFO: Current user is on ${userTier.toUpperCase()} plan.]`;
  
  const config: any = {
    systemInstruction: CORE_INSTRUCTIONS + languageHint + tierContext,
    temperature: 0.7,
  };

  // PREMIUM ONLY FEATURES
  if (userTier === 'premium') {
    if (tier === 'gemini-3-pro-preview') {
      config.thinkingConfig = { thinkingBudget: 32768 };
    } else if (tier === 'gemini-3-flash-preview') {
      config.tools = [{ googleSearch: {} }];
    }
  }

  // Maps grounding available for both to assist in humanitarian efforts
  if (tier === 'gemini-2.5-flash') {
    config.tools = [{ googleMaps: {} }];
    if (location) {
      config.toolConfig = {
        retrievalConfig: { latLng: { latitude: location.latitude, longitude: location.longitude } }
      };
    }
  }

  const parts: any[] = [{ text: message }];
  if (media) {
    parts.unshift({ inlineData: { data: media.data, mimeType: media.mimeType } });
  }

  const response = await ai.models.generateContent({
    model: tier,
    contents: [...history, { role: 'user', parts }],
    config,
  });

  const text = response.text || "No response generated.";
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => {
    if (chunk.web) return { title: chunk.web.title || 'Verified Link', uri: chunk.web.uri || '#' };
    if (chunk.maps) return { title: chunk.maps.title || 'Location Map', uri: chunk.maps.uri || '#' };
    return null;
  }).filter((s): s is { title: string; uri: string } => s !== null) || [];

  return { text, sources, modelUsed: tier };
};

export const generateImage = async (prompt: string, aspectRatio: string = "1:1") => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio, imageSize: "1K" } }
  });
  const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : null;
};

export const generateVideo = async (prompt: string, base64Image?: string, mimeType?: string, aspectRatio: '16:9' | '9:16' = '16:9') => {
  const ai = getAIClient();
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    image: base64Image ? { imageBytes: base64Image, mimeType: mimeType! } : undefined,
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio }
  });
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 8000));
    operation = await ai.operations.getVideosOperation({ operation });
  }
  const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (uri) {
    const res = await fetch(`${uri}&key=${process.env.API_KEY}`);
    return URL.createObjectURL(await res.blob());
  }
  return null;
};

export const textToSpeech = async (text: string, userTier: UserTier = 'free') => {
  const ai = getAIClient();
  
  const isTamil = detectTamil(text);
  const isRohingya = detectArabicScript(text);

  let toneInstruction = "Speak this in its native language clearly";
  let voiceName = 'Zephyr'; 
  
  // Premium users get access to more natural multi-lingual voices
  if (userTier === 'premium') {
    if (isTamil) {
      toneInstruction = "Speak this in Tamil with a more formal yet warm tone";
      voiceName = 'Kore'; 
    } else if (isRohingya) {
      toneInstruction = "Speak this in Rohingya with a deeply empathetic, supportive, and comforting tone";
      voiceName = 'Puck'; 
    } else {
      voiceName = 'Charon'; // Premium standard voice
    }
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `${toneInstruction}: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName }
        },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
};
