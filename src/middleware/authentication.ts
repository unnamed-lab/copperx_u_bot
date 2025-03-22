import { getUserData } from "../libs/redis";
import { MyContext } from "../types/context";


export const authMiddleware = async (ctx: MyContext, next: () => Promise<void>) => {
  if (!ctx.session) {
    ctx.session = { isTransferProcessActive: false }; // Initialize session if it doesn't exist
  }

  const userId = ctx.from?.id.toString(); // Get user ID from context
  if (!userId) {
    return ctx.reply("User ID not found. Please try again."); // Handle missing user ID
  }

  const token = await getUserData(userId); // Fetch user data from Redis
  if (
    !token &&
    !(
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text.startsWith("/login")
    ) &&
    !(
      ctx.message &&
      "text" in ctx.message &&
      ctx.message.text.startsWith("/start")
    )
  ) {
    return ctx.reply("🔐 Please log in first using /login."); // Prompt user to log in if not authenticated
  }
  return next();
};