import dotenv from 'dotenv';
dotenv.config();

function required(name) {
  const val = process.env[name];
  if (!val) console.warn(`[config] Warning: ${name} is not set in .env`);
  return val;
}

export const config = {
  youtube: {
    apiKey: required('YOUTUBE_API_KEY'),
    clientId: required('YOUTUBE_CLIENT_ID'),
    clientSecret: required('YOUTUBE_CLIENT_SECRET'),
    refreshToken: required('YOUTUBE_REFRESH_TOKEN'),
  },
  openrouter: {
    apiKey: required('OPENROUTER_API_KEY'),
    model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
  },
  pexels: {
    apiKey: required('PEXELS_API_KEY'),
  },
  meta: {
    pageId: process.env.META_PAGE_ID,
    igUserId: process.env.META_IG_USER_ID,
    accessToken: process.env.META_ACCESS_TOKEN,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
  niche: {
    keywords: (process.env.NICHE_KEYWORDS || 'space facts')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
};
