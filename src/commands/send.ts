import { Markup, Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import { sendFundsByEmail } from "../libs/utils";
import { getUserData } from "../libs/redis";
import { transferEmailCallback } from "../handlers/callbackHandler";

export const sendCommand = (bot: Telegraf<MyContext>) => {
  bot.command("send", async (ctx) => {
    const userId = ctx.from.id.toString();
    const token = await getUserData(userId);

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    await transferEmailCallback(bot, ctx, token);
  });
};
