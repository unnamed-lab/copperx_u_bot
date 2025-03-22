import { client } from "../libs/openai";

export const AIService = {
  generateAIResponse: async (message: string) => {
    try {
      const response = await client.chat.completions.create({
        model: "caramelldansen-1",
        messages: [
          {
            role: "system",
            content:
              "You are a friendly and helpful assistant for the Copperx Bot. Keep your responses concise and relevant.",
          },
          {
            role: "user",
            content: message,
          },
        ],
      });

      return (
        response.choices[0].message?.content ||
        "Sorry, I couldn't generate a response."
      );
    } catch (error) {
      console.error("OpenAI error:", error);
      return "Sorry, something went wrong. Please try again later.";
    }
  },
};
