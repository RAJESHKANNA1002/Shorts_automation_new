// Combines stock clips + narration audio + burned-in captions + background music
// into a final 1080x1920 (vertical) MP4 using ffmpeg.
// Install ffmpeg once: https://ffmpeg.org/download.html (already on most CI Linux runners)

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const execFileAsync = promisify(execFile);

/**
 * @param {string[]} clipPaths - portrait stock video clips, one per script segment
 * @param {string} audioPath - narration mp3/wav
 * @param {string} srtPath - caption file
 * @param {string} musicPath - background music track (optional, pass null to skip)
 * @param {string} outPath - final output mp4 path
 * @param {number} durationSec - target total duration (matches narration length)
 */
export async function assembleVideo({ clipPaths, audioPath, srtPath, musicPath, outPath, durationSec }) {
  const perClipDuration = durationSec / clipPaths.length;

  // 1. Build a concat list, trimming each clip to an even slice of total duration.
  const concatListPath = outPath.replace(/\.mp4$/, '-concat.txt');
  const trimmedPaths = [];
  for (const [i, clip] of clipPaths.entries()) {
    const trimmed = outPath.replace(/\.mp4$/, `-trim-${i}.mp4`);
    const cropParams = await detectCropFilter(clip);
    const vf = cropParams
      ? `crop=${cropParams},scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`
      : 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920';
    await execFileAsync('ffmpeg', [
      '-y', '-i', clip,
      '-t', String(perClipDuration),
      '-vf', vf,
      '-an',
      trimmed,
    ]);
    trimmedPaths.push(trimmed);
  }
  await writeFile(concatListPath, trimmedPaths.map((p) => `file '${resolve(p).replace(/\\/g, '/')}'`).join('\n'));


  const concatOut = outPath.replace(/\.mp4$/, '-concat.mp4');
  await execFileAsync('ffmpeg', [
    '-y', '-f', 'concat', '-safe', '0', '-i', concatListPath,
    '-c', 'copy', concatOut,
  ]);

  // 2. Add narration (+ optional music ducked underneath) and burn in captions.
  const audioInputs = ['-i', concatOut, '-i', audioPath];
  let filterComplex;
  let mapArgs = ['-map', '0:v'];

  if (musicPath) {
    audioInputs.push('-i', musicPath);
    filterComplex = `[1:a]volume=1.0[narr];[2:a]volume=0.15[music];[narr][music]amix=inputs=2:duration=first[aout]`;
    mapArgs.push('-map', '[aout]');
  } else {
    mapArgs.push('-map', '1:a');
  }

  const vf = `subtitles=${srtPath}:force_style='Fontsize=16,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=2,Alignment=2,MarginV=120'`;

  const args = [
    '-y', ...audioInputs,
    ...(filterComplex ? ['-filter_complex', filterComplex] : []),
    '-vf', vf,
    ...mapArgs,
    '-c:v', 'libx264', '-c:a', 'aac',
    '-shortest',
    outPath,
  ];
  await execFileAsync('ffmpeg', args);

  return outPath;
}


if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log('Run this via index.js with real inputs - see README for a manual test example.');
}

async function detectCropFilter(clipPath) {
  try {
    const { stderr } = await execFileAsync('ffmpeg', [
      '-i', clipPath,
      '-vf', 'cropdetect=24:2:0',
      '-frames:v', '20',
      '-f', 'null', '-',
    ]);
    const matches = [...stderr.matchAll(/crop=(\d+:\d+:\d+:\d+)/g)];
    return matches.length ? matches[matches.length - 1][1] : null;
  } catch (err) {
    // execFileAsync throws even on success here because ffmpeg writes to stderr;
    // the actual crop values are still in err.stderr
    const matches = [...(err.stderr || '').matchAll(/crop=(\d+:\d+:\d+:\d+)/g)];
    return matches.length ? matches[matches.length - 1][1] : null;
  }
}