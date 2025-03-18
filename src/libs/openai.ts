import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI();

export { client };