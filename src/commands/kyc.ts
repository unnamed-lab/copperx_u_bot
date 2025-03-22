import { Markup, Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import { formatKycDetails, getKycDetails, KycDto } from "../libs/kyc";
import { escapeMarkdownV2 } from "../libs/utils";
import { getUserData } from "../libs/redis";

export const kycCommand = async (bot: Telegraf<MyContext>) => {
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
        const kycImageUrl =
          "https://github.com/user-attachments/assets/ac2546a2-7112-45bd-8189-a83b1150b957";
          
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
};
