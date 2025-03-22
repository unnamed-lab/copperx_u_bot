import { Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import { helpCallback } from "../handlers/callbackHandler";

export const helpCommand = async (bot: Telegraf<MyContext>) => {
  // Define the help message with a list of available commands

  bot.command("help", helpCallback);
};
