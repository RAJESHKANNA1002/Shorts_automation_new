import fetch from 'node-fetch';
import { config } from './config.js';
import { pathToFileURL } from 'node:url';

const PROMPT_TEMPLATE = (topicHint, sampleTitles) => `
You write scripts for a short-form fact video channel (30-40 seconds spoken).

Topic area: ${topicHint}
For inspiration only (titles of popular videos in this space - do NOT copy any wording, just note the general theme):
${sampleTitles.map((t) => `- ${t}`).join('\n')}

Write ONE original 30-40 second narration script about a specific, surprising fact in this topic area.

Rules:
- First sentence MUST be a punchy hook that creates curiosity immediately (no "hi guys", no greeting, no "did you know" cliche opener)
- Simple, spoken, conversational language - short sentences
- 70-100 words total (fits ~35 seconds of narration)
- End with a surprising twist, or a question inviting comments
- Output ONLY the narration text. No title, no labels, no markdown, nothing else.
`.trim();

export async function generateScript(topicHint, sampleTitles = []) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openrouter.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.openrouter.model,
      messages: [
        { role: 'user', content: PROMPT_TEMPLATE(topicHint, sampleTitles) },
      ],
      temperature: 0.9,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const script = data.choices?.[0]?.message?.content?.trim();
  if (!script) throw new Error('No script returned from LLM');
  return script;
}

// Extract simple keywords from the script for stock footage search later.
export function extractKeywords(script, max = 6) {
  const stop = new Set(['the','a','an','is','are','was','were','and','or','but','to','of','in','on','for','it','its','this','that','with','as','by','at','from','be','has','have','had']);
  const words = script
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w));
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  generateScript('space facts', ['Why is space silent?', 'The coldest place in the universe'])
    .then((s) => {
      console.log(s);
      console.log('Keywords:', extractKeywords(s));
    })
    .catch(console.error);
}
