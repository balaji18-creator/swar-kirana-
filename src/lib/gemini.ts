import { GoogleGenAI, Type } from '@google/genai';
import { Intent, Language, ParsedCommand } from '../types';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });

const FALLBACK_REPLIES: Record<Language, string> = {
  'hi-IN': 'Maaf kijiye, samajh nahi aaya. Dobara boliye.',
  'te-IN': 'Maafi cheppandi, artham kaaledu. Malli cheppandi.',
  'en-IN': 'Sorry, I did not understand. Please try again.',
};

export async function parseCommand(text: string, language: Language): Promise<ParsedCommand> {
  const prompt = `
You are an expert AI command parser for a Kirana (Indian grocery) store.
Convert the voice command into structured JSON. The command may be in Hindi, Telugu, or English (or a mix).

Command: "${text}"
Speaker language: "${language}"

=== INTENT RULES ===
- ADD_STOCK   : owner received new stock       ("Atta aaya 20 kilo", "Got 5 milk packs")
- SALE        : owner sold something           ("Ram ko 2kg atta becho", "Sold 1 bread")
- CREDIT      : sold on credit / udhar         ("Mohan ko 500 ka udhar", "Bill 200 on Ram's khata")
- PAYMENT     : customer paid back             ("Sita ne 200 diye", "Ram paid 500")
- QUERY_STOCK : asking about stock level       ("Atta kitna hai?", "Stock check karo")
- QUERY_SALE  : asking about today's sales     ("Aaj ki sale?", "Total kitni hui?")

=== ENTITY RULES ===
- item      : product name, Title Case (e.g. "Atta", "Milk", "Rice")
- quantity  : numeric quantity (e.g. 20 for "20 kilo")
- amount    : monetary amount in ₹ (e.g. 500)
- customer  : person's name, Title Case (e.g. "Ram", "Mohan")

=== REPLY RULES ===
Generate a short, warm, friendly confirmation IN THE SAME LANGUAGE as the command.
For Hindi: use casual Hinglish (e.g. "20 kg Atta stock mein add ho gaya! ✓")
For Telugu: use casual Telugu (e.g. "20 kg Atta stock lo add chesham! ✓")
For English: use simple English (e.g. "Added 20kg Atta to stock! ✓")

Return ONLY valid JSON, no explanation.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent:  { type: Type.STRING },
            params: {
              type: Type.OBJECT,
              properties: {
                item:     { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                amount:   { type: Type.NUMBER },
                customer: { type: Type.STRING },
              },
            },
            reply: { type: Type.STRING },
          },
          required: ['intent', 'params', 'reply'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      intent: parsed.intent as Intent ?? Intent.UNKNOWN,
      params:  parsed.params  ?? {},
      reply:   parsed.reply   ?? FALLBACK_REPLIES[language],
    };
  } catch (error) {
    console.error('Gemini parse error:', error);
    return {
      intent: Intent.UNKNOWN,
      params: {},
      reply:  FALLBACK_REPLIES[language],
    };
  }
}
