import { Markup, Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import { getUserData } from "../libs/redis";
import { createPaginationKeyboard, fetchTransfers, formatTransfersMessage } from "../libs/funds";

export const transactionCommand = async (bot: Telegraf<MyContext>) => {
  // Command handler for /transfers
  bot.command("transactions", async (ctx) => {
    // Define userPageState to track the current page for each user
    const userPageState: Record<string, number> = {};

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
}