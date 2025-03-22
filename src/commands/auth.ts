import { Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import { AuthService } from "../services/authService";
import { getUserData, setOTPData, UserRedis } from "../libs/redis";

export const authCommand = (bot: Telegraf<MyContext>) => {
  bot.command("login", async (ctx) => {
    // Prompt the user to enter their email
    await ctx.reply("Please enter your email address:");

    // Set the login state to "awaiting email"
    ctx.session ??= { isTransferProcessActive: false };
    if (ctx.session) {
      ctx.session.loginState = {};
    }

    // Handle email input
    return bot.on("text", async (ctx) => {
      if (!ctx.session?.loginState) return; // Ignore if not in login state

      const text = ctx.message.text;

      // Step 1: Handle email input
      if (!ctx.session.loginState.email) {
        const email = text.trim();

        // Validate email (basic check)
        if (!email.includes("@")) {
          return ctx.reply(
            "Invalid email. Please enter a valid email address."
          );
        }

        // Save the email in the session
        ctx.session.loginState.email = email;

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
          delete ctx.session.loginState; // Reset the login state
        }
      }

      // Step 2: Handle OTP input
      else if (!ctx.session.loginState.sid) {
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
          // Display user details on successful login
          const userDetails = `
                ✅ *Logged in successfully!*\n\n
                📧 *Email*: ${token.user.email}\n
                💳 *Wallet Address*: ${token.user.walletAddress}\n
                🏦 *Wallet Type*: ${token.user.walletAccountType.toUpperCase()}\n
                ✅ *Status*: ${token.user.status.toUpperCase()}
              `;

          await ctx.reply(userDetails, { parse_mode: "MarkdownV2" });

          // Reset the login state
          delete ctx.session.loginState;

          return;
        } catch (error) {
          console.error("Error verifying OTP:", error);
          await ctx.reply("Invalid OTP. Please try again.");
          delete ctx.session.loginState; // Reset the login state
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
