import { Markup, Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import {
  CreatePayeeDto,
  deletePayee,
  getAllPayee,
  getPayee,
} from "../libs/funds";
import { getUserData } from "../libs/redis";
import { escapeMarkdownV2 } from "../libs/utils";

export const beneficiaryCommand = async (bot: Telegraf<MyContext>) => {
  // Define the beneficiary command

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
};
