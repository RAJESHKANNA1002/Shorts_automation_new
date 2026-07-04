#!/usr/bin/env python3
"""
Transcribes an audio file into short caption segments using faster-whisper.
Usage: python3 captions_helper.py path/to/audio.mp3
Prints JSON list of {start, end, text} to stdout.

Install once:
  pip install faster-whisper --break-system-packages
"""
import sys
import json
from faster_whisper import WhisperModel

def main():
    audio_path = sys.argv[1]
    # "base" model is small/fast and free; runs on CPU fine for 30-45s clips.
    model = WhisperModel("base", device="cpu", compute_type="int8")
    segments, _info = model.transcribe(audio_path, word_timestamps=False)

    out = [{"start": seg.start, "end": seg.end, "text": seg.text} for seg in segments]
    print(json.dumps(out))

if __name__ == "__main__":
    main()
