import { Markup, Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import { deleteUserData } from "../libs/redis";

export const logoutCommand = async (bot: Telegraf<MyContext>) => {
  // Command to log out the user
  bot.command("logout", async (ctx) => {
    // Remove the user's data from Redis
    ctx.reply(
      "Are you sure you want to logout?.",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("Yes", `confirm_logout`),
          Markup.button.callback("No", "cancel_logout"),
        ],
      ])
    );

    bot.action("confirm_logout", async (ctx) => {
      const userId = ctx.from.id.toString();
      await deleteUserData(userId);
      ctx.reply("✅ You have been logged out.");
      return;
    });

    bot.action("cancel_logout", (ctx) => {
      ctx.reply("❌ Logout canceled.");
      return;
    });
  });
};
