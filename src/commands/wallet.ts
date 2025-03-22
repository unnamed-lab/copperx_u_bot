import { Markup, Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import {
  formatWallets,
  getWallet,
  getWalletDefault,
  setWalletDefault,
} from "../libs/utils";
import { getUserData } from "../libs/redis";
import QRCode from "qrcode";

export const walletCommand = async (bot: Telegraf<MyContext>) => {
  // Handle the /wallets command to fetch and display wallet details
  // Command to initiate wallet interaction
  bot.command("wallets", async (ctx) => {
    await ctx.reply(
      "Do you want to check your wallets?",
      Markup.inlineKeyboard([
        [Markup.button.callback("Yes", "confirm_wallet")],
        [Markup.button.callback("No", "cancel_wallet")],
        [Markup.button.callback("Set Default Wallet", "set_default_wallet")],
      ])
    );

    // Handle "Yes" button (fetch wallet details)
    bot.action("confirm_wallet", async (ctx) => {
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
          formattedBalances,
          { parse_mode: "MarkdownV2" }
        );
      } catch (error) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          loadingMessage.message_id,
          undefined,
          "Failed to fetch wallets."
        );
      }
    });

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
            `${wallet.network.toUpperCase()} - ${wallet.walletAddress.slice(
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

        await ctx.reply(
          `✅ Wallet [${wallet.walletAddress}] is now your default wallet.`
        );
      } catch (error) {
        console.error("Error setting default wallet:", error);
        await ctx.reply("Failed to set default wallet. Please try again.");
      }
    });
  });

  // Command to display wallet details and provide a button to generate QR code
  bot.command("wallet", async (ctx) => {
    const userId = ctx.from.id.toString();
    try {
      const token = await getUserData(userId);

      if (!token) {
        return ctx.reply("Please log in first using /login.");
      }

      const wallet = await getWalletDefault(token.accessToken);

      if (!wallet) {
        return ctx.reply("No default wallet found.");
      }

      const formattedBalances = `*Your Wallet*\n\n🌐 *Network*: ${wallet.network.toUpperCase()}\n🔗 *Address*: ${
        wallet.walletAddress || "unknown"
      }\n🤖 *Wallet Type*: ${(wallet.walletType || "unknown")
        .replace("_", " ")
        .toUpperCase()}\n🪪 Wallet ID: ${wallet.id || "unknown"}`;

      await ctx.reply(formattedBalances, {
        parse_mode: "MarkdownV2",
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "Get QR Code",
              `get_qr_${wallet.walletAddress}`
            ),
          ],
        ]).reply_markup,
      });
    } catch (error) {
      console.error("Error fetching wallet details:", error);
      await ctx.reply("Failed to fetch wallet details. Please try again.");
    }

    // Handle QR code generation
    bot.action(/get_qr_(.+)/, async (ctx) => {
      const walletAddress = ctx.match[1]; // Extract wallet address from the callback data
      const userId = ctx.from.id.toString();
      const token = await getUserData(userId);

      if (!token) {
        return ctx.reply("Please log in first using /login.");
      }

      try {
        const wallet = await getWalletDefault(token.accessToken);

        if (!wallet) {
          return ctx.reply("No default wallet found.");
        }

        // Generate QR code for the wallet address
        const qrCode = await QRCode.toBuffer(walletAddress, {
          errorCorrectionLevel: "H",
          type: "png",
          width: 400,
          margin: 2,
        });

        // Create caption with wallet address
        const caption =
          `📥 **Deposit Address**\n\n` +
          `Network: ${wallet.network.toUpperCase()}\n` +
          `Address: \`${walletAddress}\`\n\n` +
          `Scan the QR code or copy the address above to send funds`;

        // Send QR code and address to the user
        await ctx.replyWithPhoto(
          { source: qrCode },
          {
            caption: caption,
            parse_mode: "MarkdownV2",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Copy Address",
                    callback_data: `copy_address_${walletAddress}`,
                  },
                ],
              ],
            },
          }
        );
      } catch (error) {
        console.error("Error generating QR code:", error);
        await ctx.reply("Failed to generate QR code. Please try again.");
      }
    });

    // Handle copy address button
    bot.action(/copy_address_(.+)/, async (ctx) => {
      const walletAddress = ctx.match[1];
      await ctx.answerCbQuery();
      await ctx.reply(`Here's your wallet address:\n\`${walletAddress}\``, {
        parse_mode: "MarkdownV2",
      });
    });
  });
};
