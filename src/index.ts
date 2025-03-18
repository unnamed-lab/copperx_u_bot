import { Markup, Telegraf } from "telegraf";
import { authenticateOTP, getUserToken, requestOTP } from "./libs/auth";
import {
  formatBalances,
  getWalletBalances,
  sendFundsByEmail,
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
      `*User Profile* 👤\n\n📧 *Email*: ${user.email}\n💳 *Wallet Address*: \n${user.walletAddress}\n🏦 *Wallet Type*: ${user.walletAccountType.toUpperCase()}\n✅ *Status*: ${user.status.toUpperCase()}`
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

/////////////////////////////////////////////
/////////////////////////////////////////////

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
