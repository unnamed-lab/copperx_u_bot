import Pusher from "pusher";
import dotenv from "dotenv";

dotenv.config();

export const pusher = new Pusher({
  appId: process.env.TELEGRAM_BOT_TOKEN!,
  key: process.env.PUSHER_KEY!,
  secret: "your-pusher-secret",
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});
