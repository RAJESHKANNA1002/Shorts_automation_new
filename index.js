import { mkdir } from 'node:fs/promises';
import { pickNextTopic } from './src/research.js';
import { generateScript, extractKeywords } from './src/script.js';
import { textToSpeech } from './src/voice.js';
import { generateCaptions } from './src/captions.js';
import { fetchClipsForKeywords } from './src/visuals.js';
import { assembleVideo } from './src/assemble.js';
import { generateThumbnail } from './src/thumbnail.js';
import { uploadToYouTube } from './src/upload/youtube.js';
import { notify } from './src/notify.js';

const OUT_DIR = './output';

async function estimateDurationSec(text) {
  // Rough: ~2.5 words/sec average spoken pace.
  const words = text.split(/\s+/).length;
  return Math.max(20, Math.min(45, words / 2.5));
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  await notify('🎬 Daily video pipeline starting...');

  try {
    // 1. Research
    const { keyword, sampleTitles } = await pickNextTopic();

    // 2. Script
    const script = await generateScript(keyword, sampleTitles);
    const hook = script.split(/[.!?]/)[0];
    console.log('[pipeline] Script:\n', script);

    // 3. Voice
    const audioPath = `${OUT_DIR}/narration.mp3`;
    await textToSpeech(script, audioPath);

    // 4. Captions
    const srtPath = `${OUT_DIR}/captions.srt`;
    await generateCaptions(audioPath, srtPath);

    // 5. Visuals
    const keywords = extractKeywords(script, 4);
    const clipPaths = await fetchClipsForKeywords(keywords, OUT_DIR);

    // 6. Assembly
    const durationSec = await estimateDurationSec(script);
    const videoPath = `${OUT_DIR}/final.mp4`;
    await assembleVideo({
      clipPaths,
      audioPath,
      srtPath,
      musicPath: null, // add a path to a royalty-free track here if you have one in data/music
      outPath: videoPath,
      durationSec,
    });

    // 7. Thumbnail
    const thumbPath = `${OUT_DIR}/thumbnail.jpg`;
    await generateThumbnail(videoPath, hook, thumbPath);

    // 8. Upload (YouTube shown here; add Meta calls once you have a public
    //    video URL - see src/upload/meta.js comments)
    const ytResult = await uploadToYouTube({
      videoPath,
      title: hook.slice(0, 90),
      description: script,
      tags: keywords,
    });

    await notify(`✅ Uploaded: https://youtube.com/shorts/${ytResult.id}`);
  } catch (err) {
    console.error(err);
    await notify(`❌ Pipeline failed: ${err.message}`);
    process.exitCode = 1;
  }
}

run();
