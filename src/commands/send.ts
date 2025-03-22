import { Markup, Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import { sendFundsByEmail } from "../libs/utils";
import { getUserData } from "../libs/redis";

export const sendCommand = (bot: Telegraf<MyContext>) => {
  bot.command("send", async (ctx) => {
    const [email, amount] = ctx.message.text.split(" ").slice(1);
    if (!email || !amount) {
      return ctx.reply("Usage: /send <email> <amount>");
    }

    ctx.reply(
      `Are you sure you want to send ${amount} USDC to ${email}?`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Yes", `confirm_send_${email}_${amount}`)],
        [Markup.button.callback("No", "cancel_send")],
      ])
    );
  });

  bot.action(/confirm_send_(.+)_(\d+)/, async (ctx) => {
    const [email, amount] = ctx.match[1].split("_");
    const userId = ctx.from.id.toString();
    const token = await getUserData(userId);

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    try {
      const result = await sendFundsByEmail(
        token.accessToken,
        email,
        Number(amount)
      );
      ctx.reply(`Funds sent: ${JSON.stringify(result)}`);
    } catch (error) {
      ctx.reply("Failed to send funds.");
    }
  });

  bot.action("cancel_send", (ctx) => {
    ctx.reply("Send funds canceled.");
  });
};
