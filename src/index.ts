import { connectRedis } from "./libs/redis";
import { initBot } from "./bot";

const startBot = async () => {
  try {
    await connectRedis();
    console.log("Redis connected.");

    const bot = initBot();
    bot
      .launch()
      .then(() => console.log("Bot is running..."))
      .catch((err) => console.error("Bot failed to start:", err));
  } catch (error) {
    console.log("Error occurred!", error);
    setTimeout(() => {
      startBot();
    }, 15000); // Restart bot instance after 15 secs
  }
};

startBot();
