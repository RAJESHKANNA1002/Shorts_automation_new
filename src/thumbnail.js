// Generates a thumbnail: grabs a frame from the assembled video, overlays bold hook text.
// Uses ffmpeg (frame extraction) + sharp (text overlay via SVG - free, no external API).

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { pathToFileURL } from 'node:url';
const execFileAsync = promisify(execFile);

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * @param {string} videoPath - the assembled final video
 * @param {string} hookText - first ~5 words of the script's hook line
 * @param {string} outPath - output jpg path
 * @param {number} frameAtSec - which second to grab the frame from (default: 1s in, avoids black intro frame)
 */
export async function generateThumbnail(videoPath, hookText, outPath, frameAtSec = 1) {
  const framePath = outPath.replace(/\.(jpg|jpeg|png)$/i, '-frame.png');

  await execFileAsync('ffmpeg', [
    '-y', '-ss', String(frameAtSec), '-i', videoPath,
    '-frames:v', '1', framePath,
  ]);

  const words = hookText.split(/\s+/).slice(0, 5).join(' ');
  const width = 1080;
  const height = 1920;
  const svg = `
    <svg width="${width}" height="${height}">
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="black" stop-opacity="0"/>
          <stop offset="100%" stop-color="black" stop-opacity="0.75"/>
        </linearGradient>
      </defs>
      <rect x="0" y="${height - 500}" width="${width}" height="500" fill="url(#shade)"/>
      <text x="50%" y="${height - 260}" font-family="Arial, sans-serif" font-weight="900"
            font-size="88" fill="white" text-anchor="middle" stroke="black" stroke-width="6"
            paint-order="stroke">
        ${escapeXml(words)}
      </text>
    </svg>
  `;

  await sharp(framePath)
    .resize(width, height)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toFile(outPath);

  return outPath;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log('Run this via index.js with a real assembled video - see README.');
}
