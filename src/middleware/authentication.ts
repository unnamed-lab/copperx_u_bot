import { getUserData } from "../libs/redis";
import { MyContext } from "../types/context";

export const authMiddleware = async (
  ctx: MyContext,
  next: () => Promise<void>
) => {
  if (!ctx.session) {
    ctx.session = { isTransferProcessActive: false }; // Initialize session if it doesn't exist
  }

  const userId = ctx.from?.id.toString(); // Get user ID from context
  if (!userId) {
    return ctx.reply("User ID not found. Please try again."); // Handle missing user ID
  }

  // Fetch user data from Redis
  const token = await getUserData(userId);

  // Allow access to /login and /start commands without authentication
  if (
    ctx.message &&
    "text" in ctx.message &&
    (ctx.message.text.startsWith("/login") ||
      ctx.message.text.startsWith("/start"))
  ) {
    return next();
  }

  // Allow access if the user is in the login process
  if (ctx.session.loginState) {
    return next();
  }

  // HACK - Disabled due the fact that the bot is not able to save session on development
  // Block access if the user is not authenticated
  //   if (!token) {
  //     return ctx.reply("🔐 Please log in first using /login.");
  //   }
  return next();
};
