import { Telegraf } from "telegraf";
import { getUserData } from "../libs/redis";
import { initializePusher } from "../services/pusherService";
import { MyContext } from "../types/context";
import dotenv from "dotenv";

dotenv.config();

// Function to start Pusher notifications
export const startPusherNotifications = async (
  bot: Telegraf<MyContext>,
  userId: string,
  chatId: number
) => {
  const token = await getUserData(userId);

  if (!token) {
    console.error("User not logged in.");
    return;
  }

  // Replace with your organization ID
  const organizationId = process.env.PUSHER_ID!;

  // Initialize Pusher and subscribe to the organization's private channel
  const channel = initializePusher(token.accessToken, organizationId);

  // Listen for deposit events
  channel.bind("deposit", (data: any) => {
    const message =
      `💰 *New Deposit Received*\n\n` +
      `${data.amount} USDC deposited on ${data.network}`;

    // Send the notification to the user
    bot.telegram.sendMessage(chatId, message, { parse_mode: "MarkdownV2" });
  });
};
