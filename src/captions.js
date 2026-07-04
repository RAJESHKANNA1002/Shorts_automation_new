// Generates word-level-ish captions from the narration audio using faster-whisper (free, local, no API key).
// Install once: pip install faster-whisper --break-system-packages
// This calls a small Python helper script (captions_helper.py) and parses its JSON output.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
const execFileAsync = promisify(execFile);

function srtTimestamp(seconds) {
  const ms = Math.floor((seconds % 1) * 1000);
  const totalSec = Math.floor(seconds);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

const PYTHON_BIN = process.platform === 'win32' ? 'py' : 'python3';

export async function generateCaptions(audioPath, srtOutPath) {
  const helperPath = fileURLToPath(new URL('./captions_helper.py', import.meta.url));
  const { stdout } = await execFileAsync(PYTHON_BIN, [helperPath, audioPath]);
  const segments = JSON.parse(stdout); // [{start, end, text}, ...]

  const srt = segments
    .map((seg, i) => `${i + 1}\n${srtTimestamp(seg.start)} --> ${srtTimestamp(seg.end)}\n${seg.text.trim()}\n`)
    .join('\n');

  await writeFile(srtOutPath, srt, 'utf-8');
  return srtOutPath;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateCaptions('./output/test-voice.mp3', './output/test-captions.srt')
    .then((p) => console.log('Saved:', p))
    .catch(console.error);
}
