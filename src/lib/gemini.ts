import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not defined. AI features will not work.");
}

export const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export const MODELS = {
  TEXT: "gemini-3-flash-preview",
  IMAGE: "gemini-2.5-flash-image",
};

export async function generateExegesis(scripture: string, queryText: string) {
  const prompt = `
    You are an expert biblical scholar specializing in exegesis (leading out the author's original meaning).
    Your goal is to explain the following scripture reference deeply, avoiding subjective or forced interpretations (eisegesis).
    
    Scripture: ${scripture}
    User Question: ${queryText}
    
    Provide a deep analytical analysis including historical context, grammar, and literary genre.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODELS.TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            interpretation: { type: Type.STRING },
            historicalContext: { type: Type.STRING },
            grammarAnalysis: { type: Type.STRING },
            literaryGenre: { type: Type.STRING },
            godIntent: { type: Type.STRING },
            crossReferences: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            geography: {
              type: Type.OBJECT,
              properties: {
                location: { type: Type.STRING },
                thenDesc: { type: Type.STRING },
                nowDesc: { type: Type.STRING }
              },
              required: ["location", "thenDesc", "nowDesc"]
            },
            videoClipQuery: { type: Type.STRING }
          },
          required: [
            "interpretation", 
            "historicalContext", 
            "grammarAnalysis", 
            "literaryGenre", 
            "godIntent", 
            "crossReferences", 
            "geography", 
            "videoClipQuery"
          ]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}
