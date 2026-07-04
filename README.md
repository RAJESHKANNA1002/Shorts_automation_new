# Shorts Automation Pipeline

Fully automated: research topic → original script → voice → captions → stock visuals →
assembled vertical video → thumbnail → upload to YouTube Shorts (Instagram/Facebook Reels
scaffolded, needs one extra hosting step — see below).

Every tool used is **free**. You only need to create free accounts/API keys.

## 1. What you need to do first (one-time setup)

### a) Install locally (to test before automating)
```bash
node -v   # need 18+

# Windows: use `python`, not `python3`
python --version
# If that fails: install from https://www.python.org/downloads/ and make sure
# to check "Add python.exe to PATH" during install. Also go to
# Settings > Apps > Advanced app settings > App execution aliases and turn OFF
# the python.exe / python3.exe toggles (Windows ships a fake alias that blocks
# the real install otherwise).

# macOS/Linux: use `python3`
python3 --version

# ffmpeg:
#   Windows: winget install ffmpeg   (or download from ffmpeg.org and add to PATH)
#   macOS: brew install ffmpeg
#   Linux: sudo apt install ffmpeg

pip install edge-tts faster-whisper --break-system-packages
```

### b) Get your free API keys

| Key | Where to get it | Free tier |
|---|---|---|
| `YOUTUBE_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → enable "YouTube Data API v3" → Create API Key | 10,000 units/day |
| `YOUTUBE_CLIENT_ID` / `SECRET` | Same console → Create OAuth Client ID → type **Desktop app** | free |
| `YOUTUBE_REFRESH_TOKEN` | One-time OAuth flow using the client id/secret above — Google's [OAuth Playground](https://developers.google.com/oauthplayground) is the fastest way: paste your client id/secret in playground settings, authorize scope `https://www.googleapis.com/auth/youtube.upload`, exchange for tokens, copy the refresh token | free |
| `OPENROUTER_API_KEY` | [openrouter.ai](https://openrouter.ai) → sign up → API Keys. Use a `:free` model (already set as default) | free |
| `PEXELS_API_KEY` | [pexels.com/api](https://www.pexels.com/api/) → sign up → API key | free |
| `META_ACCESS_TOKEN`, `META_PAGE_ID`, `META_IG_USER_ID` | [developers.facebook.com](https://developers.facebook.com/) → create an app → add Instagram Graph API + Pages API → generate a long-lived Page access token | free |
| `TELEGRAM_BOT_TOKEN` / `CHAT_ID` (optional) | Message [@BotFather](https://t.me/BotFather) on Telegram to create a bot | free |

Copy `.env.example` to `.env` and fill these in for local testing.

### c) Instagram/Facebook note (important)
Meta's Graph API needs a **public URL** for the video file — it won't accept a direct
upload from your laptop or CI runner. Since you already used **Cloudinary** in the
`parking_system-3` project, reuse that free tier here: after `assemble.js` produces
`final.mp4`, upload it to Cloudinary first, then pass the returned URL into
`uploadToInstagramReels` / `uploadToFacebookReels`. There's a comment marking exactly
where to add this in `src/upload/meta.js`.

## 2. Test each stage locally, in order

```bash
npm run research        # confirms YouTube API key works, prints trending topics
npm run test:script     # confirms OpenRouter key works, prints a sample script
node src/voice.js       # produces output/test-voice.mp3 - listen to it
node src/captions.js    # produces output/test-captions.srt - open and check timing
```

Once each of those works individually, run the full pipeline:
```bash
npm start
```
This will actually generate a full video AND upload it to YouTube — so make sure you're
happy with a test run's output/final.mp4 before wiring in real uploads (comment out the
`uploadToYouTube` call in `index.js` for a dry run).

## 3. Automate it for free (GitHub Actions)

1. Push this folder to a **public** GitHub repo (free Actions minutes are unlimited on
   public repos; private repos get 2,000 min/month free, which is still enough for one
   video/day).
2. In the repo, go to **Settings → Secrets and variables → Actions** and add every key
   from `.env.example` as a secret (same names).
3. The workflow at `.github/workflows/daily-video.yml` is already set to run daily at
   6:00 PM IST. Adjust the `cron` line if you want a different time.
4. You can also trigger it manually anytime from the **Actions** tab (`workflow_dispatch`).

## 4. What's genuinely automated vs. what needs your eye

| Fully automatic | Worth a quick manual glance |
|---|---|
| Topic pick, script, voice, captions, visuals, assembly, thumbnail, YouTube upload, Telegram notification | First few days of thumbnails (readability), and the first few scripts (make sure the LLM's hook style matches what you want — tweak the prompt in `src/script.js` if not) |

## 5. Folder map

```
shorts-automation/
├── index.js                  # orchestrates the full daily pipeline
├── src/
│   ├── config.js              # loads all API keys from .env
│   ├── research.js            # finds trending topics (metadata only, never transcripts)
│   ├── script.js               # generates an ORIGINAL script via free LLM
│   ├── voice.js                 # free TTS narration (edge-tts)
│   ├── captions.js               # Whisper-based captions -> .srt
│   ├── captions_helper.py         # Python helper called by captions.js
│   ├── visuals.js                  # free stock clips from Pexels
│   ├── assemble.js                  # ffmpeg: stitches everything into final.mp4
│   ├── thumbnail.js                  # generates thumbnail with hook text overlay
│   ├── notify.js                      # Telegram success/failure pings
│   └── upload/
│       ├── youtube.js                  # YouTube Shorts upload
│       └── meta.js                      # Instagram/Facebook Reels (needs public video URL)
├── .github/workflows/daily-video.yml    # free daily scheduled run
├── .env.example
└── package.json
```

## 6. Costs — genuinely $0 as configured

Every service above has a free tier sufficient for 1 video/day. The only thing to
watch is OpenRouter's free model rate limits and YouTube's 10,000 daily quota units
(1 upload ≈ 1,600 units, so you have huge headroom).
