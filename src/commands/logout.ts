import { Markup, Telegraf } from "telegraf";
import { MyContext } from "../types/context";
import { deleteUserData, getUserData } from "../libs/redis";
import { AuthService } from "../services/authService";

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
      const token = await getUserData(userId);

      if (!token) {
        return ctx.reply("Please log in first using /login.");
      }
      await deleteUserData(userId);
      await AuthService.logout(token.accessToken);
      ctx.reply("✅ You have been logged out.");
      return;
    });

    bot.action("cancel_logout", (ctx) => {
      ctx.reply("❌ Logout canceled.");
      return;
    });
  });
};
