import { Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import { depositCallback } from "../handlers/callbackHandler";

export const depositCommand = async (bot: Telegraf<MyContext>) => {
  // Handle the /deposit command to initiate a deposit

  // Command to initiate the deposit process
  bot.command("deposit", async (ctx) => depositCallback(bot, ctx));
};
