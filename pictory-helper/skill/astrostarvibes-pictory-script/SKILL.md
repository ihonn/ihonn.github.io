---
name: astrostarvibes-pictory-script
description: Plans and writes the next AstroStarVibes YouTube video from Channel Stats data and outputs it as a Pictory package JSON block for the AstroStarVibes Pictory Helper Chrome extension. Use when the user asks for a new AstroStarVibes video, a Pictory script, or what to make next based on channel stats.
---

# AstroStarVibes → Pictory package

Turn the channel's own numbers into one video package that the
**AstroStarVibes Pictory Helper** Chrome extension can import and fill into
Pictory's script box.

## 1. Read the channel (Channel Stats tools, read-only)

Use the Channel Stats connector to pull, for the last 28 and 90 days:

- Top videos by views, with average view duration / percentage viewed.
- Traffic sources, and top YouTube search terms if the tools provide them.
- Top countries (they hint at language and posting time).

If the Channel Stats tools aren't available, say so and work from the topic
the user gives. Never invent numbers.

## 2. Pick the topic

Choose one topic that fits what is already working (a zodiac sign, a season
or transit, a weekly forecast…). Explain the choice in 2–4 short bullets that
cite the numbers you read. If the user already named a topic, use it and only
note what the stats suggest.

## 3. Write the script

- Language: match the channel's existing titles; default to English.
- Scene 1 is the hook: at most 15 words, gives the viewer a reason to stay.
- One scene = 1–2 sentences. Pictory builds one scene per paragraph.
- Length at ~150 spoken words per minute:
  - `portrait` (Shorts): 45–55 s, about 110–135 words, 5–8 scenes.
  - `landscape` (long-form): 5–8 min unless the user asks otherwise.
- Last scene: a short call to action (comment your sign, subscribe).
- Astrology is framed as reflection and entertainment. No guaranteed
  predictions and no health, legal or financial advice.
- Each scene gets `visual`: 2–5 concrete stock-footage keywords
  (e.g. `night sky milky way timelapse`, `ocean waves moonlight`).

## 4. Write the YouTube metadata

- `title`: at most 70 characters, topic first.
- `description`: the first two lines carry the hook and the promise, then
  details, then 2–3 hashtags.
- `tags`: up to 15, under 500 characters in total, no `#`.

## 5. Output

Reply with the topic bullets, then **one** fenced `json` block in exactly this
shape, then the line: *Copy the JSON block → AstroStarVibes extension → Import.*

```json
{
  "type": "astrostarvibes.pictory/v1",
  "id": "YYYY-MM-DD-short-slug",
  "title": "…",
  "description": "…",
  "tags": ["…"],
  "format": "landscape | portrait | square",
  "voice": "narrator style for Pictory's voice-over",
  "music": "music mood",
  "why": "one sentence: why this topic, citing the stats",
  "scenes": [
    { "text": "Scene narration.", "visual": "stock keywords" }
  ]
}
```

Keep `id` stable when revising the same video, so re-importing replaces the
old version in the extension instead of adding a copy.

## 6. After Pictory (optional upload)

When the user has downloaded the finished video and asks to upload it, use
the Channel Stats upload tool if it is available, with the package's `title`,
`description` and `tags`. Upload as **private** unless the user says
otherwise, and confirm the file path and metadata with the user before
uploading.
