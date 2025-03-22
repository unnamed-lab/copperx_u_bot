import { Telegraf } from "telegraf";
import { MyContext } from "../types/context";

export const errorHandler = (bot: Telegraf<MyContext>) => {
  // Global error handler for the bot

  return bot.catch((err, ctx) => {
    console.error("Error:", err); // Log the error
    ctx.reply("❌ An unexpected error occurred. Please try again later."); // Notify the user
  });
};
