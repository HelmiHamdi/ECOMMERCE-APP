import "dotenv/config";

export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const CHAT_MODEL = "openai/gpt-4o-mini";