import fetch from 'node-fetch';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { config } from './config.js';
import { pathToFileURL } from 'node:url';

async function searchClips(keyword, perPage = 3) {
  const url = new URL('https://api.pexels.com/videos/search');
  url.search = new URLSearchParams({
    query: keyword,
    orientation: 'portrait', // vertical, matches Shorts/Reels
    per_page: String(perPage),
  }).toString();

  const res = await fetch(url, { headers: { Authorization: config.pexels.apiKey } });
  if (!res.ok) throw new Error(`Pexels search failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.videos || [];
}

function bestFileUrl(video) {
  // Prefer HD portrait files under a reasonable size.
  const files = video.video_files
    .filter((f) => f.width && f.height && f.height > f.width) // portrait only
    .sort((a, b) => b.height - a.height);
  return files[0]?.link || video.video_files[0]?.link;
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${url}`);
  await pipeline(res.body, createWriteStream(destPath));
  return destPath;
}

/**
 * Given script keywords, fetches one clip per keyword (falls back to a generic
 * keyword if a specific one has no results) and downloads them locally.
 */
export async function fetchClipsForKeywords(keywords, outDir) {
  const paths = [];
  for (const [i, kw] of keywords.entries()) {
    let videos = await searchClips(kw, 1);
    if (videos.length === 0) videos = await searchClips('abstract background', 1);
    const url = bestFileUrl(videos[0]);
    const dest = `${outDir}/clip-${i}.mp4`;
    await downloadFile(url, dest);
    paths.push(dest);
  }
  return paths;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  fetchClipsForKeywords(['ocean', 'space', 'history'], './output')
    .then((paths) => console.log('Downloaded:', paths))
    .catch(console.error);
}
