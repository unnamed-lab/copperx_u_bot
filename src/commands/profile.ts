import { Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import { profileCallback } from "../handlers/callbackHandler";

export const profileCommand = (bot: Telegraf<MyContext>) => {
  bot.command("profile", async (ctx) => profileCallback(bot, ctx));
};
