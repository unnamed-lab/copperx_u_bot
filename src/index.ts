import express from "express";
import { connectRedis } from "./libs/redis";
import { initBot } from "./bot";

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint for Render.com monitoring
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Webhook endpoint (if using webhooks instead of long polling)
app.post("/webhook", express.json(), (req, res) => {
  // Your webhook handling logic here
  res.status(200).send("OK");
});

const startBot = async () => {
  try {
    await connectRedis();
    console.log("Redis connected.");

    const bot = initBot();
    bot
      .launch()
      .then(() => console.log("Bot is running..."))
      .catch((err) => console.error("Bot failed to start:", err));

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.log("Error occurred!", error);
    setTimeout(() => {
      startBot();
    }, 15000); // Restart bot instance after 15 secs
  }
};

startBot();
