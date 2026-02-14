
import { GoogleGenAI } from "@google/genai";
import { CORE_INSTRUCTIONS } from "../constants.tsx";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const sendMessage = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) => {
  const ai = getAIClient();
  
  // Using gemini-3-pro-preview for complex reasoning and search grounding tasks
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [
      ...history,
      { role: 'user', parts: [{ text: message }] }
    ],
    config: {
      systemInstruction: CORE_INSTRUCTIONS,
      tools: [{ googleSearch: {} }],
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
    },
  });

  const text = response.text || "I'm sorry, I couldn't process that request.";
  
  // Extract sources from grounding metadata if available
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => ({
    title: chunk.web?.title || 'Verified Source',
    uri: chunk.web?.uri || '#'
  })).filter(s => s.uri !== '#') || [];

  return { text, sources };
};
