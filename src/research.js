// Research stage: find WHAT topics are trending in your niche.
// IMPORTANT: this only reads metadata (title, views, tags) — never transcripts.
// We use that only to pick a fresh topic angle, then write an ORIGINAL script in script.js.

import fetch from 'node-fetch';
import { config } from './config.js';
import { pathToFileURL } from 'node:url';

/**
 * Searches YouTube for popular videos matching a keyword, sorted by view count.
 * Returns lightweight metadata only.
 */
export async function findTrendingAngles(keyword, maxResults = 10) {
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.search = new URLSearchParams({
    part: 'snippet',
    q: keyword,
    type: 'video',
    videoDuration: 'short',
    order: 'viewCount',
    maxResults: String(maxResults),
    key: config.youtube.apiKey,
  }).toString();

  const res = await fetch(searchUrl);
  if (!res.ok) {
    throw new Error(`YouTube search failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();

  return data.items.map((item) => ({
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    videoId: item.id.videoId,
    publishedAt: item.snippet.publishedAt,
  }));
}

/**
 * Picks the next topic to make a video about, based on your configured niche keywords
 * and a rotation so you don't repeat the same angle every day.
 */
export async function pickNextTopic() {
  const keyword = config.niche.keywords[
    Math.floor(Math.random() * config.niche.keywords.length)
  ];
  const angles = await findTrendingAngles(keyword);
  const titles = angles.map((a) => a.title).join('\n - ');
  console.log(`[research] Trending titles for "${keyword}":\n - ${titles}`);

  // Just pass the keyword + observed title *patterns* (not content) downstream.
  // script.js will write something original inspired by the general theme.
  return { keyword, sampleTitles: angles.map((a) => a.title) };
}

// Allow running this file directly: `npm run research`
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  pickNextTopic().then((r) => console.log(JSON.stringify(r, null, 2))).catch(console.error);
}
