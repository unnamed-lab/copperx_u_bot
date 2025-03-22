import { Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import { AIService } from "../services/aiService";

export const aiHandler = (bot: Telegraf<MyContext>) => {
  // Bot AI functionality
  bot.on("text", async (ctx) => {
    const message = ctx.message.text;
    // Ignore commands
    if (message.startsWith("/")) {
      return;
    }
    console.log(
      "Is Transfer Process Active: ",
      ctx.session?.isTransferProcessActive
    );
    // Check if the transfer process is active
    if (ctx.session?.isTransferProcessActive) {
      return; // Skip AI processing during transfer
    }
    // Show typing indicator
    await ctx.replyWithChatAction("typing");
    try {
      const aiResponse = await AIService.generateAIResponse(message);
      ctx.reply(aiResponse);
    } catch (error) {
      console.error("Error generating AI response:", error);
      ctx.reply(
        "Sorry, I'm having trouble generating a response. Please try again later."
      );
    }
  });
};
