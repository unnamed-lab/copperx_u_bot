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
  depositFunds,
  depositFundsPayload,
  formatAmount,
  sendFunds,
  sendFundsPayload,
  validCurrencies,
  validPurposeCodes,
  validSourceOfFunds,
} from "./libs/funds";

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!, {
  telegram: { agent: undefined, webhookReply: true },
});

bot.use((ctx, next) => {
  console.log("Received update:", ctx.update);
  return next();
});

// COMMANDS

// Start command
bot.command("start", (ctx) => {
  ctx.reply(
    "Welcome to the Copperx Bot! 🚀\nWhat would you like to do?",
    Markup.inlineKeyboard([
      [Markup.button.callback("Check Balance", "balance")],
      [Markup.button.callback("Send Funds", "send")],
      [Markup.button.callback("Withdraw Funds", "withdraw")],
    ])
  );
});

// Start Action
bot.action("balance", async (ctx) => {
  const userId = ctx.from.id.toString();
  const token = await getUserData(userId);

  if (!token) {
    return ctx.reply("Please log in first using /login.");
  }

  if (!ctx.chat) return ctx.reply("Invalid chat.");

  const loadingMessage = await ctx.reply("Fetching balances...");

  try {
    const balances = await getWalletBalances(token.accessToken);
    const formattedBalances = formatBalances(balances);

    ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      undefined,
      formattedBalances,
      { parse_mode: "MarkdownV2" }
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

bot.action("send", (ctx) => {
  ctx.reply("Please use the /send command to send funds.");
});

bot.action("withdraw", (ctx) => {
  ctx.reply("Please use the /withdraw command to withdraw funds.");
});

// Help command
bot.command("help", (ctx) => {
  ctx.reply(`
    Available commands:
    /start - Start the bot
    /help - Show help
    /balance - Check wallet balances
    /send - Send funds
    /withdraw - Withdraw funds
  `);
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

    ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      undefined,
      formattedBalances,
      { parse_mode: "MarkdownV2" }
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

bot.command("receive", async (ctx) => {
  const userId = ctx.from.id.toString();
  try {
    // Get user data from Redis/session
    const token = await getUserData(userId);

    if (!token) {
      return ctx.reply("Please log in first using /login.");
    }

    // Get user's wallet address from your system
    const user: UserRedis["user"] = token.user;
    const walletAddress = user.walletAddress;
    const network = user.walletAccountType.toUpperCase();

    if (!walletAddress) {
      return ctx.reply("No wallet address found for your account.");
    }

    console.log({ walletAddress });

    // Generate QR Code
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

    // Send QR code and address
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
    console.error("Deposit error:", error);
    ctx.reply("Failed to generate deposit address. Please try again.");
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

// Deposit command
bot.command("deposit", async (ctx) => {
  const userId = ctx.from.id.toString();
  const args = ctx.message.text.split(" ").slice(1);

  // Validate input
  if (args.length < 2) {
    return ctx.reply(
      "Usage: /deposit <amount> <depositChainId> <sourceOfFunds>"
    );
  }

  const [amount, depositChainId, sourceOfFunds = "savings"] = args;

  // Validate amount
  if (isNaN(parseFloat(amount))) {
    return ctx.reply("Invalid amount. Please provide a valid number.");
  }

  // Validate source of funds
  if (!validSourceOfFunds.includes(sourceOfFunds.toLowerCase())) {
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
});

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
    ${dash} **Wallet Address**: \`${deposit.destinationAccount.walletAddress}\`
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
});

/////////////////////////////////////////////
/////////////////////////////////////////////

// Bot AI functionality
bot.on("text", async (ctx) => {
  const message = ctx.message.text;

  // Ignore commands
  if (message.startsWith("/")) {
    return;
  }

  // Show typing indicator
  await ctx.replyWithChatAction("typing");

  try {
    const aiResponse = await generateAIResponse(message);
    ctx.reply(aiResponse);
  } catch (error) {
    console.error("Error generating AI response:", error);
    ctx.reply(
      "Sorry, I'm having trouble generating a response. Please try again later."
    );
  }
});

bot.catch((err, ctx) => {
  console.error("Error:", err);
  ctx.reply("An error occurred. Please try again later.");
});

const startBot = async () => {
  try {
    await connectRedis();
    console.log("Redis connected.");
    // Launch the bot
    bot
      .launch()
      .then(() => console.log("Bot is running..."))
      .catch((err) => console.error("Bot failed to start:", err));
  } catch (error) {
    console.log("Error occurred!", error);
  }
};

startBot();
