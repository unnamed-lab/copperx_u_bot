import { Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import { startPusherNotifications } from "../handlers/pusherHandler";

export const notifyCommand = async (bot: Telegraf<MyContext>) => {
  // Command to enable deposit notifications
  bot.command("notify", async (ctx) => {
    const userId = ctx.from.id.toString();
    const chatId = ctx.chat.id;

    // Start Pusher notifications for the user
    await startPusherNotifications(bot, userId, chatId);

    ctx.reply(
      "🔔 Deposit notifications enabled. You will now receive real-time updates."
    );
  });
};
