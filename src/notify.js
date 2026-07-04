import fetch from 'node-fetch';
import { config } from './config.js';

export async function notify(message) {
  if (!config.telegram.botToken || !config.telegram.chatId) {
    console.log('[notify]', message);
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: config.telegram.chatId, text: message }),
    });
  } catch (err) {
    console.error('[notify] Telegram send failed:', err.message);
  }
}
