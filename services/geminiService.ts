import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Models
const ANALYZE_MODEL = 'gemini-3-pro-preview';
const CHAT_MODEL = 'gemini-2.5-flash-lite'; // Fast responses for text
const EDIT_MODEL = 'gemini-2.5-flash-image';

export const analyzeRoomImage = async (base64Image: string, prompt: string, roomType: string = 'room'): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: ANALYZE_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1],
            },
          },
          { text: `Context: This is a ${roomType}. ${prompt}` },
        ],
      },
    });
    return response.text || "I couldn't analyze the image.";
  } catch (error) {
    console.error("Analysis error:", error);
    throw error;
  }
};

export const visualizeTidyRoom = async (base64Image: string, instructions: string): Promise<{ text: string, image?: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: EDIT_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1],
            },
          },
          { text: instructions },
        ],
      },
    });

    let text = "";
    let image = undefined;

    // Iterate parts to find text and image
    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.text) {
                text += part.text;
            }
            if (part.inlineData) {
                image = `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    
    return { text, image };
  } catch (error) {
    console.error("Visualization error:", error);
    throw error;
  }
};

export const generatePlacementGuides = async (base64Image: string): Promise<{ text: string, image?: string }> => {
  try {
    const response = await ai.models.generateContent({
      model: EDIT_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1],
            },
          },
          { text: "Draw bright semi-transparent neon bounding boxes or arrows overlaying this image to indicate where items should be moved or placed for better organization. Do not remove items, just add the visual guides." },
        ],
      },
    });

    let text = "";
    let image = undefined;

    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.text) {
                text += part.text;
            }
            if (part.inlineData) {
                image = `data:image/png;base64,${part.inlineData.data}`;
            }
        }
    }
    
    return { text, image };
  } catch (error) {
    console.error("Guide generation error:", error);
    throw error;
  }
};

export const sendChatMessage = async (history: { role: string, parts: { text: string }[] }[], newMessage: string): Promise<string> => {
  try {
    // Simple wrapper for chat using Flash Lite for speed
    const chat = ai.chats.create({
      model: CHAT_MODEL,
      history: history,
    });
    
    const result = await chat.sendMessage({ message: newMessage });
    return result.text || "I didn't catch that.";
  } catch (error) {
    console.error("Chat error:", error);
    throw error;
  }
};