import { google } from 'googleapis';
import { createReadStream } from 'node:fs';
import { config } from '../config.js';

function getAuthedClient() {
  const oauth2Client = new google.auth.OAuth2(
    config.youtube.clientId,
    config.youtube.clientSecret
  );
  oauth2Client.setCredentials({ refresh_token: config.youtube.refreshToken });
  return oauth2Client;
}

/**
 * Uploads a video as a YouTube Short.
 * Note: getting the refresh token is a one-time manual OAuth step - see README.
 */
export async function uploadToYouTube({ videoPath, title, description, tags = [] }) {
  const auth = getAuthedClient();
  const youtube = google.youtube({ version: 'v3', auth });

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: title.slice(0, 100),
        description: `${description}\n\n#Shorts`,
        tags,
        categoryId: '27', // Education
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: createReadStream(videoPath),
    },
  });

  return res.data; // includes video id
}
