// Import necessary modules and utilities
import { Telegraf } from "telegraf";

import dotenv from "dotenv";
import { authMiddleware } from "./middleware/authentication";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { errorHandler } from "./handlers/errorHandler";
import { MyContext } from "./types/context";
import { startCommand } from "./commands/start";
import { helpCommand } from "./commands/help";
import { authCommand, emailComand, myDataCommand } from "./commands/auth";
import { kycCommand } from "./commands/kyc";
import { sendCommand } from "./commands/send";
import { walletCommand } from "./commands/wallet";
import { depositCommand } from "./commands/deposit";
import { beneficiaryCommand } from "./commands/beneficiary";
import { transferCommand } from "./commands/transfer";
import { notifyCommand } from "./commands/notification";
import { logoutCommand } from "./commands/logout";
import { transactionCommand } from "./commands/transactions";
import { balanceCommand } from "./commands/balance";
import { profileCommand } from "./commands/profile";

// Load environment variables from .env file
dotenv.config();

export const initBot = () => {
  // Initialize the Telegraf bot with the extended context
  const bot = new Telegraf<MyContext>(process.env.TELEGRAM_BOT_TOKEN!, {
    telegram: { agent: undefined, webhookReply: true },
  });

  /// Middleware to initialize session and check authentication
  bot.use(authMiddleware, rateLimitMiddleware); // Apply rate limiting

  // COMMANDS
  startCommand(bot); // /start

  helpCommand(bot); // /help

  authCommand(bot); // /login

  emailComand(bot); // /email

  myDataCommand(bot); // /me

  kycCommand(bot); // /kyc

  sendCommand(bot); // /send

  walletCommand(bot); // /wallets & /wallet

  depositCommand(bot); // /deposit

  beneficiaryCommand(bot); // /beneficiary, /addBeneficiary, /updateBeneficiary, /deleteBeneficiary

  transferCommand(bot); // /transfer, /transfers

  notifyCommand(bot); // /notify

  logoutCommand(bot); // /logout

  transactionCommand(bot); // /transactions

  balanceCommand(bot); // /balance

  profileCommand(bot); // /profile

  // Error handler
  errorHandler(bot);

  return bot;
};
