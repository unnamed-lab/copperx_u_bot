import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  baseURL: "https://api.zukijourney.com/v1",
  apiKey: process.env.ZUKI_API,
});

export { client };
