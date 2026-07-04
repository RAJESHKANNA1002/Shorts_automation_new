// Uses edge-tts (free, no API key) - Microsoft Edge's neural voices via a Python CLI.
// Install once: pip install edge-tts --break-system-packages
// Voice list: run `edge-tts --list-voices` to see all free options.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
const execFileAsync = promisify(execFile);

const DEFAULT_VOICE = 'en-US-AriaNeural'; // clear, natural narration voice, free

function ttsCommand() {
  // On Windows, edge-tts's own CLI script often isn't on PATH, but the module always is.
  return process.platform === 'win32'
    ? { cmd: 'py', baseArgs: ['-m', 'edge_tts'] }
    : { cmd: 'edge-tts', baseArgs: [] };
}

export async function textToSpeech(script, outputPath, voice = DEFAULT_VOICE) {
  const { cmd, baseArgs } = ttsCommand();
  await execFileAsync(cmd, [
    ...baseArgs,
    '--voice', voice,
    '--text', script,
    '--write-media', outputPath,
  ]);
  return outputPath;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  textToSpeech('This is a test of the automated narration voice.', './output/test-voice.mp3')
    .then((p) => console.log('Saved:', p))
    .catch(console.error);
}
