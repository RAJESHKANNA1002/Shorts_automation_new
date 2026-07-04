import { createServer } from 'node:http';
import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

const PORT = 8080;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/youtube.upload'],
});

console.log('\nOpen this URL in your browser if it does not open automatically:\n');
console.log(authUrl, '\n');

import { exec } from 'node:child_process';
const openCmd = process.platform === 'win32' ? `start "" "${authUrl}"` : `open "${authUrl}"`;
exec(openCmd, () => {});

const server = createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth2callback')) return;

  const code = new URL(req.url, REDIRECT_URI).searchParams.get('code');
  res.end('Success! You can close this tab and go back to your terminal.');
  server.close();

  const { tokens } = await oauth2Client.getToken(code);
  console.log('\n=== COPY THIS INTO YOUR .env AS YOUTUBE_REFRESH_TOKEN ===\n');
  console.log(tokens.refresh_token);
  console.log('\n==========================================================\n');
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`Waiting for you to complete sign-in in the browser... (listening on port ${PORT})`);
});