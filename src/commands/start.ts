import { Markup, Telegraf } from "telegraf";
import { escapeMarkdownV2 } from "../libs/utils";
import { MyContext } from "../types/context";
import { getUserData } from "../libs/redis";
import { getKycDetails } from "../libs/kyc";
import { balanceCallback, helpCallback } from "../handlers/callbackHandler";

export const startCommand = (bot: Telegraf<MyContext>) => {
  // Handle the /start command with a welcome message and image

  bot.command("start", async (ctx) => {
    const imageUrl =
      "https://github.com/user-attachments/assets/72b312cb-a18e-4cf7-8d46-0e412b6578b7";
    const userId = ctx.from.id.toString();
    const token = await getUserData(userId);
    const kycResponse = token
      ? await getKycDetails(token.accessToken, token.user.id)
      : null;

    await ctx.replyWithPhoto(imageUrl, {
      caption: escapeMarkdownV2(
        "🌟 Welcome to the Copperx Bot! 🌟\n\n" +
          "I'm here to help you manage your finances with ease. Here's what you can do:\n\n" +
          "💼 *Check your balances*\n" +
          "💸 *Send funds to friends or family*\n" +
          "🏦 *Withdraw funds to your bank account*\n\n" +
          "Get started by selecting an option below:"
      ),
      parse_mode: "MarkdownV2",
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.url(
            "⚠️COMPLETE YOUR KYC",
            "https://payout.copperx.io/app/kyc",
            !!kycResponse
          ),
        ],
        [Markup.button.callback("Check Balance", "balance")],
        [
          Markup.button.callback("Transfer Funds", "send"),
          Markup.button.callback("Withdraw Funds", "withdraw"),
        ],
        [Markup.button.callback("Help", "help")],
      ]).reply_markup,
    });
  });

  // Define the help message with a list of available commands
  bot.action("help", helpCallback);

  // Handle the /balance command to fetch and display wallet balances
  bot.action("balance", balanceCallback);

  bot.action("send", (ctx) => {
    ctx.reply("Please use the /transfer command to send funds.");
  });

  bot.action("withdraw", (ctx) => {
    ctx.reply("Please use the /withdraw command to withdraw funds.");
  });
};
