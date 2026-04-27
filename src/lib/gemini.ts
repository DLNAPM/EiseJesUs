import { GoogleGenAI, Type } from "@google/genai";

const apiKey = import.meta.env.VITE_API_KEY || process.env.GEMINI_API_KEY;

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
    For the geography section:
    - "location": The name of the specific place.
    - "thenDesc": Description of the place in biblical/historical times.
    - "nowDesc": Description of the place as it is today.
    - "thenImageUrl": Provide a short descriptive prompt for generating an image of a historical biblical map of this specific location.
    - "nowImageUrl": Provide a short descriptive prompt for generating a modern geographical or drone-shot image of this specific location.
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
                nowDesc: { type: Type.STRING },
                thenImageUrl: { type: Type.STRING },
                nowImageUrl: { type: Type.STRING }
              },
              required: ["location", "thenDesc", "nowDesc", "thenImageUrl", "nowImageUrl"]
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
    
    // Process response to format image URLs if they are just prompts
    const data = JSON.parse(text.trim());
    
    // Ensure URLs are valid image generation URLs
    if (data.geography) {
      const formatPrompt = (p: string) => `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=800&height=600&nologo=true`;
      if (!data.geography.thenImageUrl.startsWith('http')) {
        data.geography.thenImageUrl = formatPrompt(`historical biblical map of ${data.geography.location}, ancient style, parchment texture, high detail, ${data.geography.thenImageUrl}`);
      }
      if (!data.geography.nowImageUrl.startsWith('http')) {
        data.geography.nowImageUrl = formatPrompt(`modern geographical view or drone shot of ${data.geography.location} Israel, high resolution, realistic, ${data.geography.nowImageUrl}`);
      }
    }

    return data;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}

export async function fetchDefinition(word: string, context: string): Promise<string> {
  const prompt = `
    Define the following word or phrase in a biblical, theological, or historical context related to the study of the Bible:
    "${word}"
    
    Context of the document where this was found: "${context}"
    
    Provide a concise, academic, yet accessible definition. Do not use formatting like bold or headers, just the text of the definition.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODELS.TEXT,
      contents: prompt
    });
    return response.text.trim();
  } catch (error) {
    console.error("Fetch Definition Error:", error);
    throw error;
  }
}
