import rateLimit from "telegraf-ratelimit";
import { MyContext } from "../types/context";

// Configure rate limiting to prevent spam
const limitConfig = {
  window: 3000, // Time window in milliseconds (3 seconds)
  limit: 1, // Maximum number of messages allowed per window
  onLimitExceeded: (ctx: MyContext) => {
    ctx.reply("Please don't spam! 🛑"); // Message sent when limit is exceeded
  },
  keyGenerator: (ctx: MyContext) => ctx.from?.id.toString() || "global", // Unique key for each user
};

export const rateLimitMiddleware = rateLimit(limitConfig); // Create rate limiting middleware