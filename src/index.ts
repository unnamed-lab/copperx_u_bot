// Import necessary modules and utilities
import { Context, Markup, Telegraf } from "telegraf";
import { authenticateOTP, getUserToken, requestOTP } from "./libs/auth";
import {
  escapeMarkdownV2,
  formatBalances,
  formatWallets,
  generateAIResponse,
  getWallet,
  getWalletBalances,
  getWalletDefault,
  sendFundsByEmail,
  setWalletDefault,
  validateEmail,
} from "./libs/utils";
import { pusher } from "./libs/pusher.js";
import dotenv from "dotenv";
import {
  connectRedis,
  getOTPData,
  getUserData,
  setOTPData,
  UserRedis,
} from "./libs/redis";
import { setSession } from "./libs/storage";
import QRCode from "qrcode";
import {
  chunkCurrencies,
  chunkPurposeCodes,
  Country,
  CreateOfframpTransferDto,
  createPaginationKeyboard,
  createPayee,
  CreatePayeeDto,
  CreateSendTransferDto,
  CreateWalletWithdrawTransferDto,
  currencies,
  Currency,
  deletePayee,
  depositFunds,
  depositFundsPayload,
  fetchPayeeId,
  fetchTransfers,
  formatAmount,
  formatTransfersMessage,
  getAllPayee,
  getPayee,
  PayeeDto,
  PurposeCode,
  purposeCodes,
  RecipientRelationship,
  sendFunds,
  sendFundsPayload,
  SourceOfFunds,
  updatePayee,
  UpdatePayeeDto,
  validCountries,
  validCurrencies,
  validPurposeCodes,
  validRecipientRelationships,
  validSourceOfFunds,
  withdrawFunds,
  withdrawFundsEmail,
  withdrawFundsWallet,
} from "./libs/funds";
import rateLimit from "telegraf-ratelimit";
import { formatKycDetails, getKycDetails, KycDto } from "./libs/kyc";

// Load environment variables from .env file
dotenv.config();

// Define session data structure for state management
interface SessionData {
  isTransferProcessActive: boolean; // Tracks if a transfer process is active
}

// Extend the Telegraf context to include session data
interface MyContext extends Context {
  session?: SessionData; // Optional session data
  req?: any; // Optional request object
  res?: any; // Optional response object
}

// Initialize the Telegraf bot with the extended context
const bot = new Telegraf<MyContext>(process.env.TELEGRAM_BOT_TOKEN!, {
  telegram: { agent: undefined, webhookReply: true },
});

// Configure rate limiting to prevent spam
const limitConfig = {
  window: 3000, // Time window in milliseconds (3 seconds)
  limit: 1, // Maximum number of messages allowed per window
  onLimitExceeded: (ctx: Context) => {
    ctx.reply("Please don't spam! 🛑"); // Message sent when limit is exceeded
  },
  keyGenerator: (ctx: Context) => ctx.from?.id.toString() || "global", // Unique key for each user
};

// Middleware to initialize session and check authentication
bot.use(async (ctx, next) => {
  if (!ctx.session) {
    ctx.session = { isTransferProcessActive: false }; // Initialize session if it doesn't exist
  }

  const userId = ctx.from?.id.toString(); // Get user ID from context
  if (!userId) {
    return ctx.reply("User ID not found. Please try again."); // Handle missing user ID
  }

  const token = await getUserData(userId); // Fetch user data from Redis
  if (
    !token &&
    !(
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text.startsWith("/login")
    ) &&
    !(
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text.startsWith("/start")
    )
  ) {
    return ctx.reply("🔐 Please log in first using /login."); // Prompt user to log in if not authenticated
  }
  return next();
}, rateLimit(limitConfig)); // Apply rate limiting

// Global error handler for the bot
bot.catch((err, ctx) => {
  console.error("Error:", err); // Log the error
  ctx.reply("❌ An unexpected error occurred. Please try again later."); // Notify the user
});

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

// COMMANDS

// Handle the /start command with a welcome message and image
bot.command("start", async (ctx) => {
  // URL of the image you want to send
  const imageUrl =
    "https://private-user-images.githubusercontent.com/100434871/425706116-72b312cb-a18e-4cf7-8d46-0e412b6578b7.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NDI2MTgxNjEsIm5iZiI6MTc0MjYxNzg2MSwicGF0aCI6Ii8xMDA0MzQ4NzEvNDI1NzA2MTE2LTcyYjMxMmNiLWExOGUtNGNmNy04ZDQ2LTBlNDEyYjY1NzhiNy5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjUwMzIyJTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI1MDMyMlQwNDMxMDFaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT1kODI4YjcyMWZhMWY1ODM0OTQ5YTVjMzM1M2EyYTgzZWU1ZWIyNDY0OWZmMjE3NmMxNzkwNjMzYTgyYmQ5MTI4JlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.hyCnTSm6TzJ1RQ97r8gzzLX3POqPERO2Nj3mz9o3rRA";

  // Send the image with a caption
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
      [Markup.button.callback("Check Balance", "balance")],
      [Markup.button.callback("Send Funds", "send")],
      [Markup.button.callback("Withdraw Funds", "withdraw")],
      [Markup.button.callback("Help", "help")],
    ]).reply_markup,
  });
});

// Define the help message with a list of available commands
bot.action("help", (ctx) => {
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
});

// Handle the /balance command to fetch and display wallet balances
bot.action("balance", async (ctx) => {
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
});

bot.action("send", (ctx) => {
  ctx.reply("Please use the /transfer command to send funds.");
});

bot.action("withdraw", (ctx) => {
  ctx.reply("Please use the /withdraw command to withdraw funds.");
});

// Define the help message with a list of available commands
bot.command("help", async (ctx) => {
  await ctx.reply(helpMessage, {
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
});

bot.command("login", async (ctx) => {
  const [email] = ctx.message.text.split(" ").slice(1);
  if (!email) {
    return ctx.reply("Usage: /login <email> \nThen send /verify <code>");
  }
  try {
    const token = await requestOTP(email);

    await setOTPData(ctx.from.id.toString(), { ...token });
    ctx.reply(
      `OTP sent successfully! \nVisit your email ${email} to get your OTP.\nThen send /verify <otp>`
    );
  } catch (error) {
    ctx.reply("OTP failed. Please try again.");
  }
});

bot.command("verify", async (ctx) => {
  const [otp] = ctx.message.text.split(" ").slice(1);
  if (!otp) {
    return ctx.reply("Usage: /verfiy <otp>");
  }
  const userId = ctx.from.id.toString();
  const meta = await getOTPData(userId);

  try {
    if (meta) {
      const { email, sid } = meta;
      const token = await authenticateOTP(email, otp, sid);
      await setSession(userId, { ...token });
      ctx.reply("Logged in successfully!");
    }
  } catch (error) {
    ctx.reply("Login failed. Please try again.");
  }
});

bot.command("email", async (ctx) => {
  const userId = ctx.from.id.toString();
  try {
    const data = await getUserData(userId);
    if (data) {
      console.log({ data });

      ctx.reply(`Email: ${data?.user.email}`);
    }
  } catch (error) {
    ctx.reply("User not logged in!");
  }
});

bot.command("me", async (ctx) => {
  const userId = ctx.from.id.toString();
  try {
    const token = await getUserData(userId);
    const user: UserRedis["user"] = token?.user as UserRedis["user"];

    ctx.reply(
      `*User Profile* 👤\n\n📧 *Email*: ${user.email}\n💳 *Wallet Address*: \n${
        user.walletAddress
      }\n🏦 *Wallet Type*: ${user.walletAccountType.toUpperCase()}\n✅ *Status*: ${user.status.toUpperCase()}`
    );
  } catch (error) {
    ctx.reply("User not logged in!");
  }
});

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////

// Handle the /kyc command to check the user's KYC status
bot.command("kyc", async (ctx) => {
  const userId = ctx.from.id.toString(); // Get user ID
  const token = await getUserData(userId); // Fetch user data

  if (!token) {
    return ctx.reply("🔐 Please log in first using /login."); // Prompt user to log in if not authenticated
  }

  try {
    // Fetch KYC details for the user
    const kycResponse = await getKycDetails(token.accessToken, token.user.id);

    console.log("Response: ", kycResponse);

    if (!kycResponse) {
      // If no KYC is found, encourage the user to complete KYC
      // URL of the image you want to send
      const kycImageUrl = "https://example.com/path-to-your-kyc-image.png";

      // Send the image with the detailed caption
      await ctx.replyWithPhoto(kycImageUrl, {
        caption: escapeMarkdownV2(
          `🔐 *KYC Verification Required* 🔐\n\n` +
            `Hey there! 👋 It looks like you haven’t completed your KYC (Know Your Customer) verification yet. 🚨\n\n` +
            `✨ *Why Complete KYC?* ✨\n` +
            `- Unlock **full access** to all features, including **off-ramp transfers**.\n` +
            `- Enjoy **higher transaction limits** and **enhanced security**.\n` +
            `- Seamlessly send and receive funds without restrictions.\n\n` +
            `📜 *What You’ll Need:*\n` +
            `- A valid government-issued ID (e.g., passport, driver’s license).\n` +
            `- Proof of address (e.g., utility bill, bank statement).\n` +
            `- A quick selfie for identity verification.\n\n` +
            `⏳ *It’s Fast & Easy!*\n` +
            `The process takes just a few minutes, and once approved, you’ll have full access to all Copperx features. 🚀\n\n` +
            `👉 *Ready to Get Started?*\n` +
            `Click the button below to begin your KYC process now!`
        ),
        parse_mode: "MarkdownV2", // Use MarkdownV2 for formatting
        reply_markup: Markup.inlineKeyboard([
          Markup.button.url(
            "Complete KYC Now",
            "https://payout.copperx.io/app/kyc"
          ), // Add a button to the KYC page
        ]).reply_markup,
      });
    }

    // If KYC is found, display the KYC details
    const kycDetails = formatKycDetails(kycResponse as KycDto); // Format the KYC details
    await ctx.reply(kycDetails, { parse_mode: "MarkdownV2" }); // Send the formatted details
  } catch (error) {
    console.error("Error fetching KYC details:", error); // Log errors
    ctx.reply("❌ Failed to fetch KYC details. Please try again later."); // Notify user of failure
  }
});

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////

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

// Handle the /wallets command to fetch and display wallet details
bot.command("wallets", async (ctx) => {
  ctx.reply(
    `Do you want to check your wallets?`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("Yes", `confirm_wallet`),
        Markup.button.callback("No", "cancel_wallet"),
      ],
      [Markup.button.callback("Show Default", "default_wallet")],
    ])
  );
});

// Handle confirmation for fetching wallet details
bot.action("confirm_wallet", async (ctx) => {
  const userId = ctx.from.id.toString(); // Get user ID
  const token = await getUserData(userId); // Fetch user data

  if (!token) {
    return ctx.reply("Please log in first using /login."); // Prompt user to log in if not authenticated
  }

  if (!ctx.chat) return ctx.reply("Invalid chat."); // Handle invalid chat

  const loadingMessage = await ctx.reply("Fetching wallets..."); // Show loading message

  try {
    const wallets = await getWallet(token.accessToken); // Fetch wallet details
    const formattedBalances = formatWallets(wallets); // Format wallet details for display

    // Update the loading message with the formatted wallet details
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
});

bot.action("cancel_wallet", (ctx) => {
  ctx.reply("Wallets check canceled.");
});

bot.action("default_wallet", async (ctx) => {
  const userId = ctx.from.id.toString();
  const token = await getUserData(userId);

  if (!token) {
    return ctx.reply("Please log in first using /login.");
  }

  if (!ctx.chat) return ctx.reply("Invalid chat.");

  const loadingMessage = await ctx.reply("Fetching wallet...");

  try {
    const wallet = await getWalletDefault(token.accessToken);
    const formattedBalances = `*Your Wallet*\n\n🌐 *Network*: ${wallet?.network.toUpperCase()}\n🔗 *Address*: ${
      wallet?.walletAddress || "unknown"
    }\n🤖 *Wallet Type*: ${(wallet?.walletType || "unknown")
      .replace("_", " ")
      .toUpperCase()}\n🪪 Wallet ID: ${
      wallet?.id || "unknown"
    }\n\n\nYou can change the default address:\n/wallet def <address>`;

    ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      undefined,
      formattedBalances,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      undefined,
      "Failed to fetch balances."
    );
  }
});

bot.command("wallet", async (ctx) => {
  const [def, walletId] = ctx.message.text.split(" ").slice(1);
  const userId = ctx.from.id.toString();
  try {
    const token = await getUserData(userId);

    if (!token) return ctx.reply("User not logged in!");

    if (def === "def") {
      // TODO - fix the set api
      const wallet = await setWalletDefault(token.accessToken, walletId);

      if (!wallet)
        return ctx.reply("Could not update your details. Try agaim later.");

      return ctx.reply(
        `Wallet [${wallet.walletAddress}] is now your default wallet.`
      );
    }

    const wallet = await getWalletDefault(token?.accessToken);
    const formattedBalances = `*Your Wallet*\n\n🌐 *Network*: ${wallet?.network.toUpperCase()}\n🔗 *Address*: ${
      wallet?.walletAddress || "unknown"
    }\n🤖 *Wallet Type*: ${(wallet?.walletType || "unknown")
      .replace("_", " ")
      .toUpperCase()}\n🪪 Wallet ID: ${
      wallet?.id || "unknown"
    }\n\n\nYou can change the default address:\n/wallet def <address>`;

    ctx.reply(formattedBalances);
  } catch (error) {
    ctx.reply("User not logged in!");
  }
});

// Handle the /receive command to generate a wallet address and QR code
bot.command("receive", async (ctx) => {
  const userId = ctx.from.id.toString(); // Get user ID
  try {
    const token = await getUserData(userId); // Fetch user data

    if (!token) {
      return ctx.reply("Please log in first using /login."); // Prompt user to log in if not authenticated
    }

    const user: UserRedis["user"] = token.user; // Extract user details
    const walletAddress = user.walletAddress; // Get wallet address
    const network = user.walletAccountType.toUpperCase(); // Get wallet network

    if (!walletAddress) {
      return ctx.reply("No wallet address found for your account."); // Handle missing wallet address
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
      `Network: ${network}\n` +
      `Address: \`${walletAddress}\`\n\n` +
      `Scan the QR code or copy the address above to send funds`;

    // Send QR code and address to the user
    await ctx.replyWithPhoto(
      { source: qrCode },
      {
        caption: caption,
        parse_mode: "MarkdownV2", // Use MarkdownV2 for formatting
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
    console.error("Deposit error:", error); // Log errors
    ctx.reply("Failed to generate deposit address. Please try again."); // Notify user of failure
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

// Handle the /deposit command to initiate a deposit
bot.command("deposit", async (ctx) => {
  const userId = ctx.from.id.toString();
  const args = ctx.message.text.split(" ").slice(1);
  let activeProcess = true;

  // Validate input
  if (args.length < 2) {
    return ctx.reply(
      "Usage: /deposit <amount> <depositChainId> <sourceOfFunds>"
    );
  }

  const [amount, depositChainId, sourceOfFunds = "savings"] = args;

  if (activeProcess) {
    // Validate amount
    if (isNaN(parseFloat(amount))) {
      return ctx.reply("Invalid amount. Please provide a valid number.");
    }

    // Validate source of funds
    if (
      !validSourceOfFunds.includes(sourceOfFunds.toLowerCase() as SourceOfFunds)
    ) {
      return ctx.reply(
        `Invalid source of funds. Supported values: ${validSourceOfFunds.join(
          ", "
        )}`
      );
    }

    // Validate deposit chain ID
    if (isNaN(parseInt(depositChainId))) {
      return ctx.reply(
        "Invalid deposit chain ID. Please provide a valid number."
      );
    }

    // Ask for confirmation
    await ctx.reply(
      `Are you sure you want to deposit ${amount} USD (Source: ${sourceOfFunds}, Chain ID: ${depositChainId})?`,
      Markup.inlineKeyboard([
        Markup.button.callback(
          "Yes",
          `confirm_deposit_${amount}_${depositChainId}_${sourceOfFunds}`
        ),
        Markup.button.callback("No", "cancel_deposit"),
      ])
    );
  }

  // Handle confirmation
  bot.action(/confirm_deposit_(.+)_(\d+)_(.+)/, async (ctx) => {
    const [amount, depositChainId, sourceOfFunds = "savings"] =
      ctx.match.slice(1); // Extract arguments from the regex match
    const userId = ctx.from.id.toString();

    try {
      const token = await getUserData(userId);

      if (!token) {
        return ctx.reply("Please log in first using /login.");
      }

      // Construct the payload
      const payload = {
        amount: formatAmount(amount),
        sourceOfFunds: sourceOfFunds,
        depositChainId: parseInt(depositChainId),
      };

      console.log("Payload:", payload); // Debugging: Log the payload

      const deposit = await depositFunds(
        token.accessToken,
        payload as unknown as depositFundsPayload
      );

      console.info("Response", deposit);

      const dash = escapeMarkdownV2("-");

      // Format the deposit details
      const depositDetails = `
      ✅ **${escapeMarkdownV2("Deposit Initiated Successfully!")}**
  
      **Deposit ID**: \`${deposit.id}\`
      **Status**: ${deposit.status}
      **Amount**: ${Number(deposit.amount) / 100_000_000} ${deposit.currency}
      **Chain ID**: ${depositChainId}
  
      **Source Account**:
      ${dash} **Type**: ${deposit.sourceAccount.type}
      ${dash} **Wallet Address**: \`${deposit.sourceAccount.walletAddress}\`
      ${dash} **Network**: ${deposit.sourceAccount.network}
  
      **Destination Account**:
      ${dash} **Type**: ${deposit.destinationAccount.type}
      ${dash} **Wallet Address**: \`${
        deposit.destinationAccount.walletAddress
      }\`
      ${dash} **Network**: ${deposit.destinationAccount.network}
  
      **Fees**: ${deposit.totalFee} ${deposit.feeCurrency}
          `;

      // Send the deposit details
      await ctx.replyWithMarkdownV2(depositDetails, {
        link_preview_options: { is_disabled: true },
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Open Deposit Link",
                url: deposit.transactions[0].depositUrl, // Use the deposit URL from the response
              },
            ],
          ],
        },
      });
    } catch (error) {
      console.error("Deposit error:", error);

      console.error("Fund transfer error:", error);

      if (error instanceof Error && (error as any).response) {
        ctx.reply(
          `❌ Failed to deposit funds: ${
            (error as any).response.data.message || "Unknown error"
          }`
        );
      } else {
        ctx.reply("❌ An error occurred. Please try again later.");
      }
    }
  });
  // Handle cancellation
  bot.action("cancel_deposit", (ctx) => {
    ctx.reply("Deposit canceled.");
    activeProcess = false;
  });
});

// Command handler for /transfer
bot.command("transfer", async (ctx) => {
  const userId = ctx.from.id.toString();
  const token = await getUserData(userId);

  if (!token) {
    return ctx.reply("Please log in first using /login.");
  }

  // Ask the user whether they want to transfer to a wallet or email
  await ctx.reply(
    "How would you like to transfer funds?",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("To Wallet", "transfer_wallet"),
        Markup.button.callback("To Email", "transfer_email"),
      ],
      [Markup.button.callback("Off-Ramp", "transfer_offramp")],
      [Markup.button.callback("Cancel", "cancel_transfer")],
    ])
  );

  // Handle wallet transfer
  bot.action("transfer_wallet", async (ctx) => {
    // Set the transfer process flag to true
    ctx.session!.isTransferProcessActive = true;

    // Initialize the payload
    const transferPayload: Partial<CreateWalletWithdrawTransferDto> = {};

    // Ask for the wallet address
    await ctx.reply(
      "Please provide the wallet address:",
      Markup.inlineKeyboard([
        Markup.button.callback("⬅️ Back", "back_to_transfer_options"),
        Markup.button.callback("❌ Cancel", "cancel_transfer"),
      ])
    );

    // Listen for the user's response
    bot.on("text", async (ctx) => {
      const text = ctx.message.text;

      if (!transferPayload.walletAddress) {
        transferPayload.walletAddress = text;

        // Ask for the amount
        await ctx.reply(
          "Please enter the amount to transfer:",
          Markup.inlineKeyboard([
            Markup.button.callback("⬅️ Back", "back_to_wallet_address"),
            Markup.button.callback("❌ Cancel", "cancel_transfer"),
          ])
        );
        return;
      }

      if (!transferPayload.amount) {
        // Validate amount
        if (isNaN(parseFloat(text))) {
          return ctx.reply("❌ Invalid amount. Please enter a valid number.");
        }

        transferPayload.amount = formatAmount(text) as string;

        // Ask for the purpose code
        await ctx.reply(
          "Please select the purpose code:",
          Markup.inlineKeyboard([
            ...chunkPurposeCodes(purposeCodes, 2).map((chunk) =>
              chunk.map((purpose) =>
                Markup.button.callback(
                  purpose.replace("_", " ").toUpperCase(),
                  `purpose_code_${purpose}`
                )
              )
            ),
            [Markup.button.callback("⬅️ Back", "back_to_amount")],
            [Markup.button.callback("❌ Cancel", "cancel_transfer")],
          ])
        );
        return;
      }

      if (!transferPayload.purposeCode) {
        return; // Purpose code is handled by buttons
      }

      if (!transferPayload.currency) {
        // Ask for the currency
        await ctx.reply(
          "Please select the currency:",
          Markup.inlineKeyboard([
            ...chunkCurrencies(currencies, 3).map((chunk) =>
              chunk.map((currency) =>
                Markup.button.callback(currency, `currency_${currency}`)
              )
            ),
            [Markup.button.callback("⬅️ Back", "back_to_purpose_code")],
            [Markup.button.callback("❌ Cancel", "cancel_transfer")],
          ])
        );
        return;
      }
    });

    // Handle purpose code selection
    bot.action(/purpose_code_(.+)/, async (ctx) => {
      const purposeCode = ctx.match[1] as PurposeCode;
      transferPayload.purposeCode = purposeCode;

      // Ask for the currency
      await ctx.reply(
        "Please select the currency:",
        Markup.inlineKeyboard([
          ...chunkCurrencies(currencies, 3).map((chunk) =>
            chunk.map((currency) =>
              Markup.button.callback(currency, `currency_${currency}`)
            )
          ),
          [Markup.button.callback("⬅️ Back", "back_to_purpose_code")],
          [Markup.button.callback("❌ Cancel", "cancel_transfer")],
        ])
      );
    });

    // Handle currency selection
    bot.action(/currency_(.+)/, async (ctx) => {
      const currency = ctx.match[1] as Currency;
      transferPayload.currency = currency;

      // Confirm the transfer
      await ctx.reply(
        `Are you sure you want to transfer ${
          Number(transferPayload.amount) / 100_000_000
        } ${currency} to wallet ${transferPayload.walletAddress}?`,
        Markup.inlineKeyboard([
          [Markup.button.callback("✅ Confirm", "confirm_wallet_transfer")],
          [Markup.button.callback("⬅️ Back", "back_to_currency")],
          [Markup.button.callback("❌ Cancel", "cancel_transfer")],
        ])
      );
    });

    // Handle transfer confirmation
    bot.action("confirm_wallet_transfer", async (ctx) => {
      console.log("Payload", transferPayload);
      try {
        const transfer = await withdrawFundsWallet(
          token.accessToken,
          transferPayload as CreateWalletWithdrawTransferDto
        );

        await ctx.replyWithMarkdownV2(`
          ✅ **Wallet Transfer Successful!**

          **Transfer ID**: \`${transfer.id}\`
          **Status**: ${transfer.status}
          **Amount**: ${Number(transfer.amount) / 100_000_000} ${
          transfer.currency
        }
          **Wallet Address**: \`${transfer.destinationAccount.walletAddress}\`
        `);
      } catch (error) {
        console.error("Wallet Transfer error:", error);
        await ctx.reply(
          "❌ Failed to process wallet transfer. Please try again."
        );
      } finally {
        // Reset the transfer process flag
        ctx.session!.isTransferProcessActive = false;
      }
    });

    // Handle back to transfer options
    bot.action("back_to_transfer_options", async (ctx) => {
      await ctx.reply(
        "How would you like to transfer funds?",
        Markup.inlineKeyboard([
          [
            Markup.button.callback("To Wallet", "transfer_wallet"),
            Markup.button.callback("To Email", "transfer_email"),
          ],
          [Markup.button.callback("Off-Ramp", "transfer_offramp")],
          [Markup.button.callback("Cancel", "cancel_transfer")],
        ])
      );
    });

    // Handle back to wallet address
    bot.action("back_to_wallet_address", async (ctx) => {
      transferPayload.walletAddress = undefined;
      await ctx.reply(
        "Please provide the wallet address:",
        Markup.inlineKeyboard([
          Markup.button.callback("⬅️ Back", "back_to_transfer_options"),
          Markup.button.callback("❌ Cancel", "cancel_transfer"),
        ])
      );
    });

    // Handle back to amount
    bot.action("back_to_amount", async (ctx) => {
      transferPayload.amount = undefined;
      await ctx.reply(
        "Please enter the amount to transfer:",
        Markup.inlineKeyboard([
          Markup.button.callback("⬅️ Back", "back_to_wallet_address"),
          Markup.button.callback("❌ Cancel", "cancel_transfer"),
        ])
      );
    });

    // Handle back to purpose code
    bot.action("back_to_purpose_code", async (ctx) => {
      transferPayload.purposeCode = undefined;
      await ctx.reply(
        "Please select the purpose code:",
        Markup.inlineKeyboard([
          ...chunkPurposeCodes(purposeCodes, 2).map((chunk) =>
            chunk.map((purpose) =>
              Markup.button.callback(
                purpose.replace("_", " ").toUpperCase(),
                `purpose_code_${purpose}`
              )
            )
          ),
          [Markup.button.callback("⬅️ Back", "back_to_amount")],
          [Markup.button.callback("❌ Cancel", "cancel_transfer")],
        ])
      );
    });

    // Handle back to currency
    bot.action("back_to_currency", async (ctx) => {
      transferPayload.currency = undefined;
      await ctx.reply(
        "Please select the currency:",
        Markup.inlineKeyboard([
          ...chunkCurrencies(currencies, 3).map((chunk) =>
            chunk.map((currency) =>
              Markup.button.callback(currency, `currency_${currency}`)
            )
          ),
          [Markup.button.callback("⬅️ Back", "back_to_purpose_code")],
          [Markup.button.callback("❌ Cancel", "cancel_transfer")],
        ])
      );
    });
  });

  // Handle email transfer (unchanged)
  bot.action("transfer_email", async (ctx) => {
    // Set the transfer process flag to true
    ctx.session!.isTransferProcessActive = true;

    // Fetch payees
    try {
      const payees = await getAllPayee(token.accessToken);

      if (payees.length === 0) {
        return ctx.reply(
          "No beneficiaries found. Please add a beneficiary first."
        );
      }

      // Create buttons for each payee
      const payeeButtons = payees.map((payee) => [
        Markup.button.callback(
          `${payee.nickName} (${payee.id.slice(0, 12)})`,
          `select_payee_${payee.id}`
        ),
      ]);

      // Add a cancel button
      payeeButtons.push([
        Markup.button.callback("❌ Cancel", "cancel_transfer"),
      ]);

      // Ask the user to select a payee
      await ctx.reply(
        "Select a beneficiary to transfer funds to:",
        Markup.inlineKeyboard(payeeButtons)
      );
    } catch (error) {
      console.error("Error fetching payees:", error);
      return ctx.reply("❌ Failed to fetch beneficiaries. Please try again.");
    }

    // Handle payee selection
    bot.action(/select_payee_(.+)/, async (ctx) => {
      const payeeId = ctx.match[1]; // Extract payee ID from the callback data

      // Fetch payee details
      try {
        const payee = await getPayee(token.accessToken, payeeId);

        // Store payee ID and email in the payload
        const transferPayload: Partial<CreateSendTransferDto> = {
          payeeId: payee.id,
          email: payee.email,
        };

        // Ask for the amount
        await ctx.reply(
          `You selected ${payee.nickName} (${payee.id.slice(
            0,
            12
          )}).\n\nPlease enter the amount to transfer:`,
          Markup.inlineKeyboard([
            Markup.button.callback("⬅️ Back", "back_to_payee_selection"),
            Markup.button.callback("❌ Cancel", "cancel_transfer"),
          ])
        );

        // Handle amount input
        bot.on("text", async (ctx) => {
          const text = ctx.message.text;

          if (text.startsWith("/")) {
            return; // Ignore commands
          }

          if (!transferPayload.amount) {
            // Validate amount
            if (isNaN(parseFloat(text))) {
              return ctx.reply(
                "❌ Invalid amount. Please enter a valid number."
              );
            }

            transferPayload.amount = formatAmount(text) as string;

            // Ask for the purpose code
            await ctx.reply(
              "Please select the purpose code:",
              Markup.inlineKeyboard([
                ...chunkPurposeCodes(purposeCodes, 2).map((chunk) =>
                  chunk.map((purpose) =>
                    Markup.button.callback(
                      purpose.replace("_", " ").toUpperCase(),
                      `purpose_code_${purpose}`
                    )
                  )
                ),
                [Markup.button.callback("⬅️ Back", "back_to_amount")],
                [Markup.button.callback("❌ Cancel", "cancel_transfer")],
              ])
            );
            return;
          }

          if (!transferPayload.purposeCode) {
            return; // Purpose code is handled by buttons
          }

          if (!transferPayload.currency) {
            // Ask for the currency
            await ctx.reply(
              "Please select the currency:",
              Markup.inlineKeyboard([
                ...chunkCurrencies(currencies, 3).map((chunk) =>
                  chunk.map((currency) =>
                    Markup.button.callback(currency, `currency_${currency}`)
                  )
                ),
                [Markup.button.callback("⬅️ Back", "back_to_purpose_code")],
                [Markup.button.callback("❌ Cancel", "cancel_transfer")],
              ])
            );
            return;
          }
        });

        // Handle purpose code selection
        bot.action(/purpose_code_(.+)/, async (ctx) => {
          const purposeCode = ctx.match[1] as PurposeCode;
          transferPayload.purposeCode = purposeCode;

          // Ask for the currency
          await ctx.reply(
            "Please select the currency:",
            Markup.inlineKeyboard([
              ...chunkCurrencies(currencies, 3).map((chunk) =>
                chunk.map((currency) =>
                  Markup.button.callback(currency, `currency_${currency}`)
                )
              ),
              [Markup.button.callback("⬅️ Back", "back_to_purpose_code")],
              [Markup.button.callback("❌ Cancel", "cancel_transfer")],
            ])
          );
        });

        // Handle currency selection
        bot.action(/currency_(.+)/, async (ctx) => {
          const currency = ctx.match[1] as Currency;
          transferPayload.currency = currency;

          // Confirm the transfer
          await ctx.reply(
            `Are you sure you want to transfer ${
              Number(transferPayload.amount) / 100_000_000
            } ${currency} to ${transferPayload.email}?`,
            Markup.inlineKeyboard([
              [Markup.button.callback("✅ Confirm", "confirm_email_transfer")],
              [Markup.button.callback("⬅️ Back", "back_to_currency")],
              [Markup.button.callback("❌ Cancel", "cancel_transfer")],
            ])
          );
        });

        // Handle transfer confirmation
        bot.action("confirm_email_transfer", async (ctx) => {
          try {
            console.log("Payload", transferPayload);
            const transfer = await withdrawFundsEmail(
              token.accessToken,
              transferPayload as CreateSendTransferDto
            );

            await ctx.replyWithMarkdownV2(
              escapeMarkdownV2(`
              ✅ **Email Transfer Successful!**

              **Transfer ID**: \`${transfer.id}\`
              **Status**: ${transfer.status}
              **Amount**: ${Number(transfer.amount) / 100_000_000} ${
                transfer.currency
              }
              **Recipient**: ${transfer.customer.email}
            `)
            );
          } catch (error) {
            console.error("Email Transfer error:", error);
            await ctx.reply(
              "❌ Failed to process email transfer. Please try again."
            );
          } finally {
            // Reset the transfer process flag
            ctx.session!.isTransferProcessActive = false;
          }
        });
      } catch (error) {
        console.error("Error fetching payee details:", error);
        return ctx.reply("❌ Failed to fetch payee details. Please try again.");
      }
    });
  });

  // Handle off-ramp transfer (unchanged)
  bot.action("transfer_offramp", async (ctx) => {
    const userId = ctx.from.id.toString();
    const token = await getUserData(userId);

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    // Initialize the payload object
    const payload: Partial<CreateOfframpTransferDto> = {
      customerData: {} as any, // Initialize customerData as an empty object
    };

    // Step 1: Ask for invoiceNumber
    await ctx.reply("Please provide the invoice number:");

    // Listen for the user's response
    bot.on("text", async (ctx) => {
      const text = ctx.message.text;

      // Step 1: Collect invoiceNumber
      if (!payload.invoiceNumber) {
        payload.invoiceNumber = text;
        await ctx.reply("Please provide the invoice URL:");
        return;
      }

      // Step 2: Collect invoiceUrl
      if (!payload.invoiceUrl) {
        payload.invoiceUrl = text;
        await ctx.reply(
          "Please provide the purpose code (e.g., self, salary, gift):"
        );
        return;
      }

      // Step 3: Collect purposeCode
      if (!payload.purposeCode) {
        if (!validPurposeCodes.includes(text as PurposeCode)) {
          return ctx.reply(
            `Invalid purpose code. Supported values: ${validPurposeCodes.join(
              ", "
            )}`
          );
        }
        payload.purposeCode = text as PurposeCode;
        await ctx.reply(
          "Please provide the source of funds (e.g., salary, savings):"
        );
        return;
      }

      // Step 4: Collect sourceOfFunds
      if (!payload.sourceOfFunds) {
        if (!validSourceOfFunds.includes(text as SourceOfFunds)) {
          return ctx.reply(
            `Invalid source of funds. Supported values: ${validSourceOfFunds.join(
              ", "
            )}`
          );
        }
        payload.sourceOfFunds = text as SourceOfFunds;
        await ctx.reply(
          "Please provide the recipient relationship (e.g., self, spouse):"
        );
        return;
      }

      // Step 5: Collect recipientRelationship
      if (!payload.recipientRelationship) {
        if (
          !validRecipientRelationships.includes(text as RecipientRelationship)
        ) {
          return ctx.reply(
            `Invalid recipient relationship. Supported values: ${validRecipientRelationships.join(
              ", "
            )}`
          );
        }
        payload.recipientRelationship = text as RecipientRelationship;
        await ctx.reply("Please provide the quote payload:");
        return;
      }

      // Step 6: Collect quotePayload
      if (!payload.quotePayload) {
        payload.quotePayload = text;
        await ctx.reply("Please provide the quote signature:");
        return;
      }

      // Step 7: Collect quoteSignature
      if (!payload.quoteSignature) {
        payload.quoteSignature = text;
        await ctx.reply("Please provide the preferred wallet ID:");
        return;
      }

      // Step 8: Collect preferredWalletId
      if (!payload.preferredWalletId) {
        payload.preferredWalletId = text;
        await ctx.reply("Please provide the customer's name:");
        return;
      }

      // Step 9: Collect customer's name
      if (!payload.customerData?.name) {
        payload.customerData!.name = text;
        await ctx.reply(
          "Please provide the customer's business name (if any):"
        );
        return;
      }

      // Step 10: Collect customer's business name
      if (!payload.customerData?.businessName) {
        payload.customerData!.businessName = text;
        await ctx.reply("Please provide the customer's email:");
        return;
      }

      // Step 11: Collect customer's email
      if (!payload.customerData?.email) {
        payload.customerData!.email = text;
        await ctx.reply(
          "Please provide the customer's country (e.g., usa, ind):"
        );
        return;
      }

      // Step 12: Collect customer's country
      if (!payload.customerData?.country) {
        if (!validCountries.includes(text as Country)) {
          return ctx.reply(
            `Invalid country. Supported values: ${validCountries
              .map((el) => el.toUpperCase())
              .join(", ")}`
          );
        }
        payload.customerData!.country = text as Country;
        await ctx.reply("Please provide the source of funds file (if any):");
        return;
      }

      // Step 13: Collect sourceOfFundsFile
      if (!payload.sourceOfFundsFile) {
        payload.sourceOfFundsFile = text;
        await ctx.reply("Please provide a note (if any):");
        return;
      }

      // Step 14: Collect note
      if (!payload.note) {
        payload.note = text;

        // All details collected, ask for confirmation
        await ctx.reply(
          `Are you sure you want to initiate the off-ramp transfer with the following details?\n\n` +
            `Invoice Number: ${payload.invoiceNumber}\n` +
            `Invoice URL: ${payload.invoiceUrl}\n` +
            `Purpose Code: ${payload.purposeCode}\n` +
            `Source of Funds: ${payload.sourceOfFunds}\n` +
            `Recipient Relationship: ${payload.recipientRelationship}\n` +
            `Quote Payload: ${payload.quotePayload}\n` +
            `Quote Signature: ${payload.quoteSignature}\n` +
            `Preferred Wallet ID: ${payload.preferredWalletId}\n` +
            `Customer Name: ${payload.customerData!.name}\n` +
            `Customer Business Name: ${payload.customerData!.businessName}\n` +
            `Customer Email: ${payload.customerData!.email}\n` +
            `Customer Country: ${payload.customerData!.country}\n` +
            `Source of Funds File: ${payload.sourceOfFundsFile}\n` +
            `Note: ${payload.note}`,
          Markup.inlineKeyboard([
            [Markup.button.callback("Yes", "confirm_withdraw")],
            [Markup.button.callback("No", "cancel_withdraw")],
          ])
        );
        return;
      }
    });

    // Handle confirmation
    bot.action("confirm_withdraw", async (ctx) => {
      try {
        // Format the response
        const transfer = await withdrawFunds(
          token.accessToken,
          payload as CreateOfframpTransferDto
        );
        const transferDetails = `
        ✅ **Off-Ramp Transfer Initiated Successfully\\!**

        **Transfer ID**: \`${transfer.id}\`
        **Status**: ${transfer.status}
        **Amount**: ${Number(transfer.amount) / 100_000_000} ${
          transfer.currency
        }
        **Source Country**: ${transfer.sourceCountry}
        **Destination Country**: ${transfer.destinationCountry}
        **Destination Currency**: ${transfer.destinationCurrency}

        **Source Account**:
        \\- **Type**: ${transfer.sourceAccount.type}
        \\- **Wallet Address**: \`${transfer.sourceAccount.walletAddress}\`
        \\- **Network**: ${transfer.sourceAccount.network}

        **Destination Account**:
        \\- **Type**: ${transfer.destinationAccount.type}
        \\- **Wallet Address**: \`${transfer.destinationAccount.walletAddress}\`
        \\- **Network**: ${transfer.destinationAccount.network}

        **Fees**: ${transfer.totalFee} ${transfer.feeCurrency}
      `;

        // Send the transfer details
        await ctx.replyWithMarkdownV2(transferDetails, {
          link_preview_options: { is_disabled: true },
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Open Withdrawal Link",
                  url: transfer.paymentUrl,
                },
              ],
            ],
          },
        });
      } catch (error) {
        console.error("Off-Ramp Transfer error:", error);

        if (error instanceof Error && (error as any).response) {
          ctx.reply(
            `❌ Failed to initiate off-ramp transfer: ${
              (error as any).response.data.message || "Unknown error"
            }`
          );
        } else {
          ctx.reply("❌ An error occurred. Please try again later.");
        }
      }
    });

    // Handle cancellation
    bot.action("cancel_withdraw", (ctx) => {
      ctx.reply("Off-ramp transfer canceled.");
    });
  });

  // Handle cancellation
  bot.action("cancel_transfer", (ctx) => {
    // Reset the transfer process flag
    ctx.session!.isTransferProcessActive = false;

    ctx.reply("Transfer canceled.");
  });
});

// Define userPageState to track the current page for each user
const userPageState: Record<string, number> = {};

// Command handler for /transfers
bot.command("transfers", async (ctx) => {
  const userId = ctx.from.id.toString();
  const token = await getUserData(userId);

  if (!token) {
    return ctx.reply("Please log in first using /login.");
  }

  // Initialize the page state for the user
  userPageState[userId] = 1;

  try {
    // Fetch the first page of transfers
    const transfersResponse = await fetchTransfers(
      token.accessToken,
      userPageState[userId],
      10
    );

    // Format and send the transfers data
    const message = formatTransfersMessage(
      transfersResponse,
      userPageState[userId]
    );
    const keyboard = createPaginationKeyboard(
      transfersResponse,
      userPageState[userId]
    );

    await ctx.reply(message, {
      parse_mode: "MarkdownV2",
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    });
  } catch (error) {
    console.error("Error fetching transfers:", error);
    await ctx.reply("❌ Failed to fetch transfers. Please try again.");
  }

  // Handle "Refresh" button
  bot.action("refresh_page", async (ctx) => {
    const token = await getUserData(userId);

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    try {
      // Fetch the current page of transfers
      const transfersResponse = await fetchTransfers(
        token.accessToken,
        userPageState[userId],
        10
      );

      // Format and send the transfers data
      const message = formatTransfersMessage(
        transfersResponse,
        userPageState[userId]
      );
      const keyboard = createPaginationKeyboard(
        transfersResponse,
        userPageState[userId]
      );

      if (!ctx.chat) return ctx.reply("Invalid chat.");

      const loadingMessage = await ctx.reply("Refreshing...");

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loadingMessage.message_id,
        undefined,
        message,
        {
          parse_mode: "MarkdownV2",
          reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
        }
      );
    } catch (error) {
      console.error("Error refreshing page:", error);
      await ctx.reply("❌ Failed to refresh the page. Please try again.");
    }
  });

  // Handle "Next" button
  bot.action("next_page", async (ctx) => {
    const token = await getUserData(userId);

    // Increment the page
    userPageState[userId] += 1;

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    try {
      // Fetch the next page of transfers
      const transfersResponse = await fetchTransfers(
        token.accessToken,
        userPageState[userId],
        10
      );

      // Format and send the transfers data
      const message = formatTransfersMessage(
        transfersResponse,
        userPageState[userId]
      );
      const keyboard = createPaginationKeyboard(
        transfersResponse,
        userPageState[userId]
      );

      await ctx.editMessageText(message, {
        parse_mode: "MarkdownV2",
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });
    } catch (error) {
      console.error("Error fetching next page:", error);
      await ctx.reply("❌ Failed to fetch the next page. Please try again.");
    }
  });

  // Handle "Previous" button
  bot.action("prev_page", async (ctx) => {
    const token = await getUserData(userId);

    // Decrement the page
    userPageState[userId] -= 1;

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    try {
      // Fetch the previous page of transfers
      const transfersResponse = await fetchTransfers(
        token.accessToken,
        userPageState[userId],
        10
      );

      // Format and send the transfers data
      const message = formatTransfersMessage(
        transfersResponse,
        userPageState[userId]
      );
      const keyboard = createPaginationKeyboard(
        transfersResponse,
        userPageState[userId]
      );

      await ctx.editMessageText(message, {
        parse_mode: "MarkdownV2",
        reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
      });
    } catch (error) {
      console.error("Error fetching previous page:", error);
      await ctx.reply(
        "❌ Failed to fetch the previous page. Please try again."
      );
    }
  });
});

// Handle the /beneficiaries command to fetch and display saved beneficiaries
bot.command("beneficiaries", async (ctx) => {
  const userId = ctx.from.id.toString(); // Get user ID
  const token = await getUserData(userId); // Fetch user data

  if (!token) {
    return ctx.reply("Please log in first using /login."); // Prompt user to log in if not authenticated
  }

  try {
    const payees = await getAllPayee(token.accessToken); // Fetch all beneficiaries

    if (payees.length === 0 && !!Array.isArray(payees)) {
      return ctx.reply("No beneficiaries found."); // Handle no beneficiaries found
    }

    let message = "📋 *Beneficiaries*\n\n"; // Initialize message
    payees.forEach((payee) => {
      message +=
        `- 🆔 ID: ${payee.id}\n` +
        `- 😊 Name: ${payee.displayName}\n` +
        `- 📛 Nickname: ${payee.nickName}\n` +
        `- ☎️ Phone Number: ${payee.phoneNumber}\n` +
        `- 📧 Email: ${payee.email}\n` +
        `- 🏦 Has Bank: ${payee.hasBankAccount ? "✅" : "❌"}\n\n`; // Format beneficiary details
    });

    await ctx.reply(escapeMarkdownV2(message), { parse_mode: "MarkdownV2" }); // Send formatted message
  } catch (error) {
    console.error("Error fetching beneficiaries:", error); // Log errors
    await ctx.reply("❌ Failed to fetch beneficiaries. Please try again."); // Notify user of failure
  }
});

bot.command("beneficiary", async (ctx) => {
  const userId = ctx.from.id.toString();
  const token = await getUserData(userId);

  if (!token) {
    return ctx.reply("Please log in first using /login.");
  }

  const [id] = ctx.message.text.split(" ").slice(1);
  if (!id) {
    return ctx.reply("Usage: /beneficiary <id>");
  }

  try {
    const payee = await getPayee(token.accessToken, id);

    const message =
      `📋 *Beneficiary Details*\n\n` +
      `- 🆔 ID: ${payee.id}\n` +
      `- 😊 Name: ${payee.displayName}\n` +
      `- 1️⃣ First Name: ${payee.firstName}\n` +
      `- 2️⃣ Last Name: ${payee.lastName}\n` +
      `- 📛 Nickname: ${payee.nickName}\n` +
      `- 📧 Email: ${payee.email}\n` +
      `- 📞 Phone: ${payee.phoneNumber || "N/A"}\n` +
      `- 🏦 Bank: ${
        payee.bankAccount ? payee.bankAccount?.bankName : "N/A"
      }\n` +
      `- 🌍 Country: ${
        payee.bankAccount ? payee.bankAccount.country : "N/A"
      }\n`;

    await ctx.reply(escapeMarkdownV2(message), { parse_mode: "MarkdownV2" });
  } catch (error) {
    console.error("Error fetching beneficiary details:", error);
    await ctx.reply(
      "❌ Failed to fetch beneficiary details. Please try again."
    );
  }
});

// Handle the /addBeneficiary command to add a new beneficiary
bot.command("addBeneficiary", async (ctx) => {
  const userId = ctx.from.id.toString(); // Get user ID
  const token = await getUserData(userId); // Fetch user data

  if (!token) {
    return ctx.reply("Please log in first using /login."); // Prompt user to log in if not authenticated
  }

  let activeProcess = true; // Track if the add beneficiary process is active

  // Initialize the state for the user
  let addBeneficiaryState: CreatePayeeDto = {} as any;

  if (!addBeneficiaryState.bankAccount) {
    addBeneficiaryState.bankAccount = {} as any; // Initialize bank account details
  }

  // Start the process by asking for the nickname
  await ctx.reply(
    "Let's add a new beneficiary! 🎉\n\nPlease provide the beneficiary's nickname:",
    Markup.inlineKeyboard([
      Markup.button.callback("❌ Cancel", "cancel_add_beneficiary"),
    ])
  );
});

// Handle the /updateBeneficiary command to update an existing beneficiary
bot.command("updateBeneficiary", async (ctx) => {
  const userId = ctx.from.id.toString(); // Get user ID
  const token = await getUserData(userId); // Fetch user data

  if (!token) {
    return ctx.reply("Please log in first using /login."); // Prompt user to log in if not authenticated
  }

  const [id] = ctx.message.text.split(" ").slice(1); // Extract beneficiary ID
  if (!id) {
    return ctx.reply("Usage: /updateBeneficiary <id>"); // Handle invalid input
  }

  // Start the process by asking for the new nickname
  await ctx.reply(
    "Let's update the beneficiary! 🎉\n\nPlease provide the new nickname:",
    Markup.inlineKeyboard([
      Markup.button.callback("❌ Cancel", "cancel_update_beneficiary"),
    ])
  );
});

// Handle the /deleteBeneficiary command to delete a beneficiary
bot.command("deleteBeneficiary", async (ctx) => {
  const userId = ctx.from.id.toString(); // Get user ID
  const token = await getUserData(userId); // Fetch user data

  if (!token) {
    return ctx.reply("Please log in first using /login."); // Prompt user to log in if not authenticated
  }

  const [id] = ctx.message.text.split(" ").slice(1); // Extract beneficiary ID
  if (!id) {
    return ctx.reply("Usage: /deleteBeneficiary <id>"); // Handle invalid input
  }

  try {
    const result = await deletePayee(token.accessToken, id); // Delete the beneficiary
    await ctx.reply(`✅ Beneficiary deleted successfully!`); // Notify user of success
  } catch (error) {
    console.error("Error deleting beneficiary:", error); // Log errors
    await ctx.reply("❌ Failed to delete beneficiary. Please try again."); // Notify user of failure
  }
});

/////////////////////////////////////////////
/////////////////////////////////////////////

// Bot AI functionality
// bot.on("text", async (ctx) => {
//   const message = ctx.message.text;

//   // Ignore commands
//   if (message.startsWith("/")) {
//     return;
//   }

//   console.log(
//     "Is Transfer Process Active: ",
//     ctx.session?.isTransferProcessActive
//   );
//   // Check if the transfer process is active
//   if (ctx.session?.isTransferProcessActive) {
//     return; // Skip AI processing during transfer
//   }

//   // Show typing indicator
//   await ctx.replyWithChatAction("typing");

//   try {
//     const aiResponse = await generateAIResponse(message);
//     ctx.reply(aiResponse);
//   } catch (error) {
//     console.error("Error generating AI response:", error);
//     ctx.reply(
//       "Sorry, I'm having trouble generating a response. Please try again later."
//     );
//   }
// });

bot.catch((err, ctx) => {
  console.error("Error:", err);
  ctx.reply("An error occurred. Please try again later.");
});

// Function to start the bot
const startBot = async () => {
  try {
    await connectRedis(); // Connect to Redis
    console.log("Redis connected.");

    // Launch the bot
    bot
      .launch()
      .then(() => console.log("Bot is running...")) // Log successful launch
      .catch((err) => console.error("Bot failed to start:", err)); // Log launch errors
  } catch (error) {
    console.log("Error occurred!", error); // Log general errors
    startBot();
  }
};

// Start the bot
startBot();
