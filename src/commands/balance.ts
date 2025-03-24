import { Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import { getUserData } from "../libs/redis";
import { getWalletDefaultBalance } from "../libs/utils";

export const balanceCommand = (bot: Telegraf<MyContext>) => {
  // Handle the /balance command to check the user's balance

  // Command to check the user's balance
  bot.command("balance", async (ctx) => {
    const userId = ctx.from.id.toString();
    const token = await getUserData(userId);

    if (!token) {
      return ctx.reply(
        "You need to log in first. Use the /login command to log in."
      );
    }

    if (!ctx.chat) return ctx.reply("Invalid chat.");

    // Get the user's balance from the database
    const balance = await getWalletDefaultBalance(token.accessToken);
    const decimals = balance?.decimals || 0;

    // Send the user's balance as a message
    ctx.reply(
      `💰 Your current balance is: ${
        (Number(balance?.balance) / 1) * (10 ^ decimals)
      } ${balance?.symbol}`
    );
  });
};
