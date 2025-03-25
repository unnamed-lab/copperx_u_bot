import { Markup, Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import { AuthService } from "../services/authService";
import {
  getAuthAttempts,
  getUserData,
  resetAuthAttempts,
  setAuthAttempts,
  setOTPData,
  UserRedis,
} from "../libs/redis";
import { getWalletDefaultBalance } from "../libs/utils";
import { getKycDetails } from "../libs/kyc";
import {
  balanceCallback,
  depositCallback,
  helpCallback,
  transferCallback,
  transferOffRampCallback,
} from "../handlers/callbackHandler";

export const authCommand = (bot: Telegraf<MyContext>) => {
  const logResponse = async (ctx: MyContext, token: UserRedis) => {
    const wallet = await getWalletDefaultBalance(token.accessToken);

    if (!wallet) {
      return ctx.reply("No default wallet found.");
    }
    const userDetails = `
✅ Logged In!\n
📧 Email: ${token.user.email}
💵 Balance: ${wallet.balance} ${wallet.symbol}
💳 Wallet Address: ${wallet.address}
🏦 Wallet ID: ${token.user.walletId}
✅ Status: ${token.user.status.toUpperCase()}
    `;

    const kycResponse = token
      ? await getKycDetails(token.accessToken, token.user.id)
      : null;

    await ctx.reply(
      userDetails,
      Markup.inlineKeyboard([
        [
          Markup.button.url(
            "⚠️COMPLETE YOUR KYC",
            "https://payout.copperx.io/app/kyc",
            !!kycResponse
          ),
        ],
        [
          Markup.button.callback("💰 Deposit USC", "deposit"),
          Markup.button.callback("💰 Withdraw USC", "transfer"),
        ],
        [Markup.button.callback("💳 Check Balance", "balance")],
        [Markup.button.callback("🏦 Request Off-Ramp", "transfer_offramp")],
        [Markup.button.callback("Help", "help")],
      ])
    );

    // Define the help message with a list of available commands
    bot.action("help", helpCallback);

    // Handle the /balance command to fetch and display wallet balances
    bot.action("balance", balanceCallback);

    bot.action("deposit", async (ctx) => depositCallback(bot, ctx));

    bot.action("transfer", async (ctx) => transferCallback(bot, ctx, token));

    bot.action("transfer_offramp", async (ctx) =>
      transferOffRampCallback(bot, ctx, token)
    );
  };

  bot.command("login", async (ctx) => {
    let loginState: { email: string; sid: string } = {} as any;

    const userId = ctx.from.id.toString(); // Get user ID
    const userToken = await getUserData(userId); // Fetch user data
    const attempts = (await getAuthAttempts(userId)) || {
      count: 0,
      lastAttempt: 0,
    };
    const remainingAttempts = 5 - attempts.count;

    if (userToken) {
      ctx.reply("User is already logged in."); // Prompt user
      await logResponse(ctx, userToken);
      return;
    }

    // Get current attempts

    // Prompt the user to enter their email
    await ctx.reply("Please enter your email address:");

    // Handle email input
    bot.hears(/.*/, async (ctx) => {
      const text = ctx.message.text;

      // Update attempts count
      const attempts = (await getAuthAttempts(userId)) || {
        count: 0,
        lastAttempt: 0,
      };
      await setAuthAttempts(userId, {
        count: attempts.count + 1,
        lastAttempt: Date.now(),
      });

      // Step 1: Handle email input
      if (!loginState.email) {
        const email = text.trim();

        // Validate email (basic check)
        if (!email.includes("@")) {
          return ctx.reply(
            `Invalid email. Please enter a valid email address.\n${
              remainingAttempts - 1
            } attempts remaining.`
          );
        }

        // Save the email in the session
        loginState.email = email;

        try {
          // Request OTP
          const token = await AuthService.login(email);

          // Save OTP data (sid) in Redis
          await setOTPData(ctx.from.id.toString(), { ...token });

          // Prompt the user to enter the OTP
          await ctx.reply(
            `OTP sent to ${email}. Please check your email and enter the OTP here.`
          );
        } catch (error) {
          console.error("Error sending OTP:", error);
          await ctx.reply("Failed to send OTP. Please try again.");
        }
        return;
      }
      // Step 2: Handle OTP input
      if (!loginState.sid) {
        const otp = text.trim();

        // Validate OTP (basic check)
        if (otp.length !== 6 || isNaN(Number(otp))) {
          return ctx.reply("Invalid OTP. Please enter a 6-digit code.");
        }

        // Fetch OTP data from Redis
        const userId = ctx.from.id.toString();

        // Verify the OTP
        const token = await AuthService.verifyOTP(userId, otp);

        if (!token) {
          return ctx.reply(
            "OTP expired or invalid. Please start over with /login."
          );
        }

        try {
          await logResponse(ctx, token);
          await resetAuthAttempts(userId); // Reset the auth attempts
          loginState = { email: "", sid: "" }; // Reset the login state
          return;
        } catch (error) {
          console.error("Error verifying OTP:", error);
          await ctx.reply("Invalid OTP. Please try again.");
          loginState = { email: "", sid: "" }; // Reset the login state
          return;
        }
      }
    });
  });
};

export const emailComand = (bot: Telegraf<MyContext>) => {
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
};

export const myDataCommand = (bot: Telegraf<MyContext>) => {
  bot.command("me", async (ctx) => {
    const userId = ctx.from.id.toString();
    try {
      const token = await getUserData(userId);
      const user: UserRedis["user"] = token?.user as UserRedis["user"];

      ctx.reply(
        `*User Profile* 👤\n\n📧 *Email*: ${
          user.email
        }\n💳 *Wallet Address*: \n${
          user.walletAddress
        }\n🏦 *Wallet Type*: ${user.walletAccountType.toUpperCase()}\n✅ *Status*: ${user.status.toUpperCase()}`
      );
    } catch (error) {
      ctx.reply("User not logged in!");
    }
  });
};
