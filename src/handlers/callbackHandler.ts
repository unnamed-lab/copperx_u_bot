import { CallbackQuery, Update } from "telegraf/typings/core/types/typegram";
import { getUserData } from "../libs/redis";
import {
  escapeMarkdownV2,
  formatBalances,
  getWalletBalances,
} from "../libs/utils";
import { MyContext } from "../types/context";
import { Context, Markup, Telegraf } from "telegraf";

/**
 * Generates a help message for the Copperx Bot with a list of available commands.
 * The message is formatted using MarkdownV2 for better readability in messaging platforms.
 *
 * The help message includes the following sections:
 * - Authentication: Commands for logging in and verifying OTP.
 * - Wallet Management: Commands for checking balances, viewing wallet details, setting a default wallet, and receiving funds.
 * - Transfers: Commands for sending funds, initiating transfers, and withdrawing funds.
 * - Beneficiaries: Commands for managing saved beneficiaries.
 * - Transactions: Command for viewing transaction history.
 * - Support: Information on how to get help and support.
 *
 * @returns {string} The formatted help message.
 */
const helpMessage = escapeMarkdownV2(
  "🛠️ *Copperx Bot Help* 🛠️\n\n" +
    "Here are the commands you can use:\n\n" +
    "🔐 *Authentication*\n" +
    "`/login <email>` - Log in with your email.\n" +
    "`/verify <otp>` - Verify your OTP to complete login.\n\n" +
    "💼 *Wallet Management*\n" +
    "`/balance` - Check your wallet balances.\n" +
    "`/wallets` - View your wallet details.\n" +
    "`/wallet def <address>` - Set a default wallet.\n" +
    "`/receive` - Get your wallet address and QR code.\n\n" +
    "💸 *Transfers*\n" +
    "`/send <email> <amount>` - Send funds to an email.\n" +
    "`/transfer` - Initiate a transfer (wallet, email, or off-ramp).\n" +
    "`/withdraw` - Withdraw funds to your bank account.\n\n" +
    "📋 *Beneficiaries*\n" +
    "`/beneficiaries` - View your saved beneficiaries.\n" +
    "`/beneficiary <id>` - View details of a specific beneficiary.\n" +
    "`/addBeneficiary` - Add a beneficiary's details.\n" +
    "`/updateBeneficiary <id>` - Update a beneficiary's details.\n" +
    "`/deleteBeneficiary <id>` - Delete a beneficiary.\n\n" +
    "📄 *Transactions*\n" +
    "`/transfers` - View your transaction history.\n\n" +
    "❓ *Support*\n" +
    "Need help? Click the button below to visit our support page."
);

export const helpCallback = async (ctx: MyContext) => {
  ctx.reply(helpMessage, {
    parse_mode: "MarkdownV2",
    reply_markup: Markup.inlineKeyboard([
      [
        Markup.button.url(
          "Copperx Support",
          "https://t.me/copperxcommunity/2183"
        ),
      ],
    ]).reply_markup,
  });
};

export const balanceCallback = async (
  ctx: MyContext<Update.CallbackQueryUpdate<CallbackQuery>>
) => {
  if (!ctx.from) return ctx.reply("Invalid user."); // Handle undefined 'from'
  const userId = ctx.from.id.toString(); // Get user ID
  const token = await getUserData(userId); // Fetch user data

  if (!token) {
    return ctx.reply("Please log in first using /login."); // Prompt user to log in if not authenticated
  }

  if (!ctx.chat) return ctx.reply("Invalid chat."); // Handle invalid chat

  const loadingMessage = await ctx.reply("Fetching balances..."); // Show loading message

  try {
    const balances = await getWalletBalances(token.accessToken); // Fetch wallet balances
    const formattedBalances = formatBalances(balances); // Format balances for display

    // Update the loading message with the formatted balances
    ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      undefined,
      formattedBalances,
      { parse_mode: "MarkdownV2" } // Use MarkdownV2 for formatting
    );
  } catch (error) {
    // Handle errors
    ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      undefined,
      "Failed to fetch balances."
    );
  }
};

export const transferWalletCallback = async (
  ctx: MyContext<Update.CallbackQueryUpdate<CallbackQuery>>) => {
    
  }