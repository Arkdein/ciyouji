#!/usr/bin/env python3
"""Generate offline Mandarin audio (MeloTTS via sherpa-onnx) for every vocab item.

Usage: python3 scripts/generate-audio.py MODEL_DIR [--shard N/M]
Writes public/audio/<id>.mp3 (headword) and <id>-ex.mp3 (example sentence), then
run `python3 scripts/make-audio-manifest.py` to refresh public/audio/manifest.json.
Existing files are skipped, so the script is safe to re-run after adding words.
"""
import json, os, subprocess, sys
import sherpa_onnx, soundfile as sf

model_dir = sys.argv[1]
shard, shards = 0, 1
if "--shard" in sys.argv:
    shard, shards = map(int, sys.argv[sys.argv.index("--shard") + 1].split("/"))
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, "public", "audio")
os.makedirs(out, exist_ok=True)
items = json.load(open(os.path.join(root, "src", "data", "vocab.json"), encoding="utf-8"))

cfg = sherpa_onnx.OfflineTtsConfig(
    model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(
            model=f"{model_dir}/model.onnx", lexicon=f"{model_dir}/lexicon.txt",
            tokens=f"{model_dir}/tokens.txt", dict_dir=f"{model_dir}/dict"),
        num_threads=2, provider="cpu"),
    rule_fsts=",".join(f"{model_dir}/{f}" for f in ["date.fst", "number.fst", "phone.fst", "new_heteronym.fst"]
                       if os.path.exists(f"{model_dir}/{f}")),
    max_num_sentences=1)
tts = sherpa_onnx.OfflineTts(cfg)

def synth(text, path, speed):
    if os.path.exists(path):
        return
    a = tts.generate(text, sid=0, speed=speed)
    wav = path + ".tmp.wav"
    sf.write(wav, a.samples, a.sample_rate)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-ar", "24000",
                    "-codec:a", "libmp3lame", "-b:a", "40k", path], check=True)
    os.remove(wav)

done = 0
for n, it in enumerate(items):
    if n % shards != shard:
        continue
    synth(it["w"], os.path.join(out, f'{it["id"]}.mp3'), 0.9)
    synth(it["ex"], os.path.join(out, f'{it["id"]}-ex.mp3'), 0.95)
    done += 1
    if done % 25 == 0:
        print(f"shard {shard}: {done} items", flush=True)
print(f"shard {shard}: finished", flush=True)
