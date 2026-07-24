---
title: "How Posting Actually Works"
description: "A plain-English walkthrough of the environment — where notes live, what the publish command does, and how a note goes from your editor to the live website."
draft: false
author: Ridoy
date: 2024-09-05
tags: [reference, setup, guide, environment]
---

This note explains **exactly** how posting works in this garden. No jargon — just the actual flow.

## The big picture

There are **two stages**: LOCAL (preview on your computer) and LIVE (deploy to the internet).

```
LOCAL (your computer):
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  You write  │ ──> │   content/   │ ──> │  JSON file │
│  in Obsidian│     │  (markdown)  │     │ + Database │
└─────────────┘     └──────────────┘     └────────────┘
                      ↑                      ↑
                      │                      │
                 You save files        bun run publish
                                        ↓
                     ┌──────────────┐
                     │  localhost:  │  ← bun run dev
                     │  3000        │
                     └──────────────┘

LIVE (the internet):
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  git push   │ ──> │   GitHub     │ ──> │   Vercel     │
│             │     │  (your repo) │     │  (auto-build │
│             │     │              │     │   + deploy)  │
└─────────────┘     └──────────────┘     └──────────────┘
                                                ↓
                                          ┌──────────┐
                                          │ Live site│
                                          │ (HTTPS)  │
                                          └──────────┘
```

**Local** is for you — write, preview, iterate. **Live** is for readers — push to GitHub, Vercel builds and deploys automatically.

## Step 1: You write a note

You create a markdown file in the `content/` folder. It can be anywhere — `content/notes/mynote.md`, `content/essays/mynote.md`, even `content/mynote.md`.

The file has two parts: **frontmatter** (metadata at the top) and **body** (the actual content).

```markdown
---
title: "My First Note"
description: "What this note is about."
draft: false
author: Ridoy
date: 2024-09-05
tags: [essay, personal]
---

This is where you write your note. You can use **bold**, *italic*,
[[wikilinks]], ==highlights==, callouts, code blocks, everything.

> [!tip] The most important field
> `draft: false` — this is what makes the note visible on the website.
> If it's `true` or missing, the note stays private.
```

## Step 2: You run the publish command

Open your terminal and run:

```bash
bun run publish
```

This is what happens (in order):

1. **Scan** — the script looks through every `.md` file in `content/`
2. **Filter** — it skips any note with `draft: true` (or no draft field)
3. **Parse** — it reads the YAML frontmatter (title, tags, date, etc.)
4. **Render** — it converts markdown to HTML (wikilinks, callouts, code, math, mermaid, transclusions, ink, contribution graphs)
5. **Links** — it figures out which notes link to which (for backlinks and the graph)
6. **Assets** — it copies images, audio, video, PDFs to `public/content-assets/`
7. **Database** — it saves everything into SQLite (`db/garden.db`)

You'll see output like this:

```
🌱  Digital Garden — publish

  vault: content/
  discovered 28 markdown file(s)
  publishing 27 (draft:false), skipping 1 (draft)

  rendering [1/27] my-first-note
  rendering [2/27] ...
  ...
  ✓ published 27 note(s) in 1.2s
```

## Step 3: You preview locally

```bash
bun run dev
```

This starts the Next.js dev server at `http://localhost:3000`. You open it in your browser and see your garden. Every time you edit a note and re-run `bun run publish`, the site updates.

> [!tip] Two terminals
> Keep two terminal windows open:
> - Terminal 1: `bun run publish:watch` (auto re-publishes when you save)
> - Terminal 2: `bun run dev` (runs the website)
>
> Now when you save a note in Obsidian, Terminal 1 re-publishes it, and the browser refreshes automatically.

## Step 4: You deploy to the live site

When you're happy with your notes, push to GitHub:

```bash
git add .
git commit -m "new notes"
git push
```

If you set up Vercel or GitHub Actions (see [[Setup Guide]]), the site auto-deploys. The build runs `bun run publish && bun run build` on the server, so your notes go live.

## What makes a note "published" vs "private"

| Frontmatter | What happens |
|-------------|-------------|
| `draft: false` | ✅ Published — visible on the website |
| `draft: true` | 🔒 Private — stays in the vault, never appears on the site |
| (no draft field) | 🔒 Private — treated as draft by default |

That's the only rule. If `draft: false`, it's public. Everything else stays private.

## Where everything lives

| Path | What's there |
|------|-------------|
| `content/` | Your Obsidian vault — all markdown files |
| `content/assets/` | Images, audio, video, PDFs referenced by notes |
| `content/Ink/` | Obsidian Ink drawings (`.drawing` / `.writing` files) |
| `db/garden.db` | The SQLite database (generated by `bun run publish`) |
| `public/content-assets/` | Copied media files (generated by `bun run publish`) |
| `scripts/publish.ts` | The publish script — reads content/, writes to DB |
| `src/` | The website code (Next.js) |

## What the database stores

When you publish, each note gets a row in the database with:

- `slug` — the URL-safe name (e.g., `my-first-note`)
- `title` — from frontmatter
- `html` — the pre-rendered HTML (so the site is fast)
- `tags` — JSON array
- `links` — JSON array of outgoing wikilinks (for backlinks)
- `wordCount`, `publishDate`, `path`, etc.

The website reads from this database — it never reads your markdown files directly. That's why you must run `bun run publish` after editing.

## The full cycle (cheat sheet)

```
LOCAL (while writing):
  1. Write/edit .md file in content/ (with draft: false)
  2. bun run publish        ← renders notes to JSON
  3. bun run dev            ← preview at localhost:3000

LIVE (when ready to publish):
  4. git add .
  5. git commit -m "new notes"
  6. git push               ← Vercel auto-deploys!
```

## How prev/next navigation works

At the bottom of every note, there's a **Previous** and **Next** button. There are two ways to control which notes they point to:

### Option A: Automatic (by date) — default

If you don't set `prev` or `next` in frontmatter, the buttons follow **publish date order**. Notes with earlier dates are "previous", later dates are "next".

### Option B: Manual (in Obsidian frontmatter)

You can explicitly set which note comes before/after by adding `prev` and `next` to the frontmatter:

```yaml
---
title: "My Essay"
description: "Part 2 of my series."
draft: false
author: Ridoy
date: 2024-09-05
tags: [essay, series]
prev: "My First Essay"     ← the note that comes before this one
next: "My Third Essay"     ← the note that comes after this one
---
```

The values are **note titles** (not filenames). When you set `prev` or `next`, those override the date-based order for this note.

> [!tip] When to use manual prev/next
> Use it for **series** — e.g., a multi-part essay where you want readers to go in a specific order regardless of publish dates.

## How related notes work

The **"Related notes"** section at the bottom of each note is computed automatically. You don't need to do anything — it analyzes:

1. **Shared tags** — notes with the same tags as this note (weight: 2 per shared tag)
2. **2-hop links** — notes that your outgoing links also link to (weight: 3)
3. **Shared links** — notes that link to the same third notes (weight: 1)

The top 6 related notes are shown with a badge explaining why they're related ("shared tags", "connected via", "links to same").

## How backlinks work

The **"Linked from this note"** panel shows every note that links TO the current note. This is automatic — whenever you write `[[This Note Title]]` in another note, that note appears in this note's backlinks.

For example, if note A contains `[[Digital Gardens]]`, then "Digital Gardens" shows note A in its backlinks panel.

The backlink panel also shows the **sentence context** — the actual sentence where the link appears — so you can see how the referencing note uses this one.

## Common mistakes

> [!warning] "I published but my note doesn't show up"
> Check: does the frontmatter have `draft: false`? If it's `true` or missing, the note is private.

> [!warning] "I edited a note but the website didn't change"
> You need to run `bun run publish` again. The website reads from the database, not your files. Use `bun run publish:watch` to auto-publish on save.

> [!warning] "My wikilink shows as broken (red)"
> The target note must have `draft: false` and the title must match. `[[Digital Gardens]]` looks for a note with title "Digital Gardens".

> [!warning] "My image doesn't load"
> Images go in `content/assets/` and are referenced as `![[filename.png]]`. Run `bun run publish` to copy them to `public/content-assets/`.

## See also

- [[Setup Guide]] — full deployment instructions (Vercel, GitHub Pages, Netlify)
- [[Code Execution Playground]] — test the Run button
- [[Media Embeds Reference]] — test images, audio, video, PDF, ink
- [[Contribution Graph]] — test the heatmap
- [[Callouts Reference]] — all callout types
