# 词游记 · Word Journey (H1 Chinese 8655)

词游记 is a free, installable web app that turns H1 Chinese (SEAB 8655) vocabulary into a journey: nine topical strands plus the idiom bank become stops on a map, and secure words earn a stamp. It covers topical vocabulary and idioms: 635 entries across nine topical strands plus an idiom bank, spaced-repetition practice, exam-style cloze and typed questions, listening dictation, and short news snippets (original summaries of real 联合早报 reports).

Everything runs in the student's browser. There is no server, no account and no AI at run time.

## What students get

- **Today**: a 12-card session. Due reviews first, then new words (3 / 5 / 8 / 12 per day, student's choice).
- **Mastery ladder**: meaning → word → cloze → typed recall → dictation. Words only count as *secure* after they survive longer gaps (1, 2, 4, 8, 16 days).
- **Forgiving streak**: weekly goal of 4 days, banked rest days, no punishment for a missed day.
- **Exam countdown**: set the exam date; the app tells students if they are on pace and switches to revision-only for the last 14 days.
- **Handwriting (书写)**: students trace new characters with a finger (stroke order and direction are checked), then write them from memory on later days. Characters come from words the student has already met. Writing has its own spaced-repetition track, never blocks a word from becoming secure, and appears in the teacher report.
- **Offline**: install to the home screen; "保存全部音频 Save all audio" under Progress caches the pronunciations.
- **Report**: Print / Save as PDF, Send to teacher (Google Form), or Copy code.

## Deploy (once)

1. Create a new **public** repository on GitHub (e.g. `ciyouji`). Free GitHub Pages requires a public repo.
2. Push this folder to the `main` branch.
3. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Wait for the *Deploy to GitHub Pages* action (Actions tab). Your site is at `https://<username>.github.io/<repo>/`.
5. Give students the link. On phones: Share → Add to Home Screen.

`base: './'` and hash routing mean the same build works at any repo path, with no changes.

## Class progress (optional)

See [`teacher/README.md`](teacher/README.md). Without this step students can still export a PDF or copy a code.

## Local development

```bash
npm ci
npm run dev        # http://localhost:5173
npm test           # scheduling / exercise-engine tests
npm run build      # outputs dist/
```

## Editing content

- `src/data/vocab.json`: entries `{id, t:"w"|"i", s:"s1".."s9"|"idiom", tier, w, py, cn, en, ex}`.
- `src/data/news.json`: snippets. Keep them **paraphrased** with a source line. Do not paste article text.
- After changing words or example sentences, regenerate audio (below). Cards are keyed by headword, so a word appearing in two lists is practised once.

## Handwriting data

Stroke-order data comes from [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) (derived from Make Me a Hanzi; **Arphic Public License**, text kept in `public/strokes/ARPHICPL.TXT`). The pad itself is [Hanzi Writer](https://hanziwriter.org) (MIT). Only the 747 characters used in the word lists are bundled (about 3 MB). After adding words, run:

```bash
node scripts/copy-stroke-data.mjs
```

Hanzi Writer checks that each stroke is drawn in the right order and direction and roughly the right shape. It does not recognise free-form handwriting, and short strokes (dots, small hooks) can be fiddly on a phone, so the pad is set to be forgiving: after three misses on one stroke it is accepted.

## Audio

Clips are pre-generated offline Mandarin TTS (MeloTTS via sherpa-onnx), stored in `public/audio/` as `<id>.mp3` (word) and `<id>-ex.mp3` (example sentence). If a clip is missing the app falls back to the browser's Chinese voice.

```bash
pip install sherpa-onnx numpy
# download the vits-melo-tts-zh_en model, then:
python3 scripts/generate-audio.py <model-dir> [--shard 0/3]
python3 scripts/make-audio-manifest.py
```

**Listen before you ship.** Polyphonic characters (e.g. 行, 得, 重) can be mispronounced by TTS. Spot-check a few dozen clips, especially idioms.

## Privacy and policy

- Progress lives in the student's own browser (localStorage). Clearing site data or switching device loses it; Progress → Download backup saves a file.
- The app asks only for class and index number (nickname optional). Do not add NRIC, full names or emails.
- The repo and site are public. Do not add SEAB past-paper passages or other copyrighted text to the repo.
- Check your school's or MOE's guidance on staff-hosted student tools before rollout.
