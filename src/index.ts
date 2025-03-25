import express from "express";
import { connectRedis } from "./libs/redis";
import { initBot } from "./bot";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to serve static files (CSS, images if needed)
app.use(express.static("public"));

// Set view engine (using EJS for simplicity)
app.set("view engine", "ejs");
app.set("views", "./views");

// Health check endpoint for Render.com monitoring
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Webhook endpoint (if using webhooks instead of long polling)
app.post("/webhook", express.json(), (req, res) => {
  // Your webhook handling logic here
  res.status(200).send("OK");
});

// Main info page
app.get("/", (req, res) => {
  res.render("index", {
    botName: "Copperx Bot",
    description:
      "Simplify USDC banking! Deposit, withdraw, and transfer funds directly in Telegram. Secure and user-friendly.",
    commands: [
      { command: "/start", description: "Start interacting with the bot" },
      { command: "/help", description: "Get help information" },
    ],
    repoUrl: "https://github.com/unnamed-lab/copperx_u_bot",
  });
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
      console.log(`Visit http://localhost:${PORT} for bot info`);
    });
  } catch (error) {
    console.log("Error occurred!", error);
    setTimeout(() => {
      startBot();
    }, 15000); // Restart bot instance after 15 secs
  }
};

startBot();
