import { Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import { AuthService } from "../services/authService";
import { getUserData, setOTPData, UserRedis } from "../libs/redis";
import { escapeMarkdownV2 } from "../libs/utils";

export const authCommand = (bot: Telegraf<MyContext>) => {
  bot.command("login", async (ctx) => {
    let loginState: { email: string; sid: string } = {} as any;

    const userId = ctx.from.id.toString(); // Get user ID
    const userToken = await getUserData(userId); // Fetch user data

    if (userToken) {
      ctx.reply("User is already logged in."); // Prompt user
      const userDetails = `
✅ *Logged In!*\n
📧 *Email*: ${userToken.user.email}
💳 *Wallet Address*: ${userToken.user.walletAddress}
🏦 *Wallet ID*: ${userToken.user.walletId}
✅ *Status*: ${userToken.user.status.toUpperCase()}
            `;

      await ctx.reply(escapeMarkdownV2(userDetails), {
        parse_mode: "MarkdownV2",
      });
      return;
    }

    // Prompt the user to enter their email
    await ctx.reply("Please enter your email address:");

    // Handle email input
    bot.hears(/.*/, async (ctx) => {
      const text = ctx.message.text;
      console.log({ text });

      // Step 1: Handle email input
      if (!loginState.email) {
        const email = text.trim();

        // Validate email (basic check)
        if (!email.includes("@")) {
          return ctx.reply(
            "Invalid email. Please enter a valid email address."
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

        console.log({ token });
        if (!token) {
          return ctx.reply(
            "OTP expired or invalid. Please start over with /login."
          );
        }

        try {
          // Display user details on successful login
          const userDetails = `
✅ *Logged in successfully!*\n
📧 *Email*: ${token.user.email}
💳 *Wallet Address*: ${token.user.walletAddress}
🏦 *Wallet ID*: ${token.user.walletId}
✅ *Status*: ${token.user.status.toUpperCase()}
            `;

          await ctx.reply(escapeMarkdownV2(userDetails), {
            parse_mode: "MarkdownV2",
          });

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
