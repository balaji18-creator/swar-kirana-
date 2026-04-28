
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export async function parseCommand(text: string, language: string) {
  const prompt = `
    You are an expert command parser for a Kirana Store (Convenience Shop). 
    Convert the following voice command (which could be in Hindi, Telugu, or English) into a structured JSON object.

    Command: "${text}"
    Language: "${language}"

    Rules for Intents:
    - ADD_STOCK: When shop owner says they received or added stock (e.g. "Atta aaya 20kg", "Added 5 milk packs")
    - SALE: When owner sells something (e.g. "Ram ko 2kg atta becho", "Sold 1 bread")
    - CREDIT: When something is sold on credit/udhar (e.g. "Mohan ko 500 udhar", "Bill 200 on Ram's account")
    - PAYMENT: When a customer pays back credit (e.g. "Sita ne 200 diya", "Received 500 payment from Ram")
    - QUERY_STOCK: Asking about stock (e.g. "Atta kitna hai?", "Check milk stock")
    - QUERY_SALE: Asking about today's sales (e.g. "Aaj ki sale kitni hai?", "Show today's total")

    Entity Mapping:
    - item: The product name (e.g. "Atta", "Milk")
    - quantity: Numeric value for stock/sale (e.g. 20, 2)
    - amount: Numeric value for money/khata (e.g. 500, 200)
    - customer: Name of the person (e.g. "Ram", "Mohan")

    Also generate a 'reply' - a natural, friendly confirmation in the same language as the command.

    Output format MUST be JSON:
    {
      "intent": "INTENT_NAME",
      "params": { "item": "...", "quantity": 0, "amount": 0, "customer": "..." },
      "reply": "..."
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: { type: Type.STRING },
            params: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                amount: { type: Type.NUMBER },
                customer: { type: Type.STRING },
              }
            },
            reply: { type: Type.STRING }
          },
          required: ["intent", "params", "reply"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    return { 
      intent: 'UNKNOWN', 
      params: {}, 
      reply: language === 'hi-IN' ? 'Maaf kijiye, samajh nahi aaya.' : 'Sorry, I did not understand.' 
    };
  }
}
