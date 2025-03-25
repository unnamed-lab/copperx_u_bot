import { Markup, Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import {
  chains,
  escapeMarkdownV2,
  formatWallets,
  getWallet,
  getWalletDefault,
  setWalletDefault,
} from "../libs/utils";
import { getUserData } from "../libs/redis";
import QRCode from "qrcode";
import { receiveCallback } from "../handlers/callbackHandler";

export const walletCommand = async (bot: Telegraf<MyContext>) => {
  // Handle the /wallets command to fetch and display wallet details
  // Command to initiate wallet interaction
  bot.command("wallets", async (ctx) => {
    const userId = ctx.from.id.toString();
    const token = await getUserData(userId);

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    if (!ctx.chat) return ctx.reply("Invalid chat.");

    const loadingMessage = await ctx.reply("Fetching wallets...");

    try {
      const wallets = await getWallet(token.accessToken);
      const formattedBalances = formatWallets(wallets);

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loadingMessage.message_id,
        undefined,
        escapeMarkdownV2(formattedBalances),
        {
          parse_mode: "MarkdownV2",
          reply_markup: Markup.inlineKeyboard([
            Markup.button.callback("Set Default Wallet", "set_default_wallet"),
            // Use Markup to create the button
          ]).reply_markup,
        }
      );
    } catch (error) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loadingMessage.message_id,
        undefined,
        "Failed to fetch wallets."
      );
    }

    // Handle "No" button (cancel)
    bot.action("cancel_wallet", (ctx) => {
      ctx.reply("Wallets check canceled.");
    });

    // Handle "Set Default Wallet" button
    bot.action("set_default_wallet", async (ctx) => {
      const userId = ctx.from.id.toString();
      const token = await getUserData(userId);

      if (!token) {
        return ctx.reply("Please log in first using /login.");
      }

      try {
        const wallets = await getWallet(token.accessToken);

        if (!wallets || wallets.length === 0) {
          return ctx.reply("No wallets found.");
        }

        // Create buttons for each wallet
        const walletButtons = wallets.map((wallet) => [
          Markup.button.callback(
            `${
              chains.find((el) => el.id.toString() === wallet.network)?.name
            } - ${wallet.walletAddress.slice(
              0,
              6
            )}...${wallet.walletAddress.slice(-6)}`,
            `select_wallet_${wallet.id}`
          ),
        ]);

        await ctx.reply(
          "Select a wallet to set as default:",
          Markup.inlineKeyboard(walletButtons)
        );
      } catch (error) {
        console.error("Error fetching wallets:", error);
        await ctx.reply("Failed to fetch wallets. Please try again.");
      }
    });

    // Handle wallet selection
    bot.action(/select_wallet_(.+)/, async (ctx) => {
      const walletId = ctx.match[1]; // Extract wallet ID from the callback data
      const userId = ctx.from.id.toString();
      const token = await getUserData(userId);

      if (!token) {
        return ctx.reply("Please log in first using /login.");
      }

      try {
        const wallet = await setWalletDefault(token.accessToken, walletId);

        if (!wallet) {
          return ctx.reply("Failed to set default wallet. Please try again.");
        }

        const networkName =
          chains.find((el) => el.id.toString() === wallet.network)?.name ||
          "unknown";
        await ctx.reply(
          `✅ Wallet [${wallet.walletAddress}] on ${networkName} network is now your default wallet.`
        );
      } catch (error) {
        console.error("Error setting default wallet:", error);
        await ctx.reply("Failed to set default wallet. Please try again.");
      }
    });
  });

  // Command to display wallet details and provide a button to generate QR code
  bot.command("wallet", async (ctx) => receiveCallback(bot, ctx));
};
