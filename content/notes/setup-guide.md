---
title: "Setup Guide — Local + GitHub Deployment"
description: "Step-by-step guide to run the garden locally, publish notes from the terminal, and deploy it live for free on GitHub Pages or Vercel."
draft: false
date: 2024-09-04
tags: [reference, setup, deployment, guide]
---

This guide shows you how to set up the digital garden on your own machine, publish notes from the terminal, and deploy it live for **free**.

## Prerequisites

Install these on your computer:

1. **Node.js** (v18+) — from [nodejs.org](https://nodejs.org)
2. **Bun** — from [bun.sh](https://bun.sh) (faster than npm)
3. **Git** — from [git-scm.com](https://git-scm.com)
4. **Obsidian** — from [obsidian.md](https://obsidian.md) (for writing notes)

## Part 1: Local Setup

### Step 1: Clone the project

```bash
git clone https://github.com/YOUR_USERNAME/your-garden.git
cd your-garden
bun install
```

### Step 2: Set up the database

```bash
bun run db:push
```

This creates the SQLite database from the Prisma schema.

### Step 3: Write notes in Obsidian

Open the `content/` folder as an Obsidian vault. Write notes with this frontmatter:

```yaml
---
title: "My Note"
description: "A short summary."
draft: false
date: 2024-08-15
tags: [essay, thinking]
---

The body of the note…
```

> [!warning] Important
> Only notes with `draft: false` are published. Notes with `draft: true` (or no draft field) stay private.

### Step 4: Publish your notes

From the terminal:

```bash
bun run publish
```

This scans `content/`, renders every `draft: false` note to HTML, copies assets, and syncs to the database.

### Step 5: Preview locally

```bash
bun run dev
```

Open `http://localhost:3000` to see your garden.

### Step 6: Auto-publish while writing

```bash
bun run publish:watch
```

This re-publishes automatically every time you save a note in Obsidian. Keep this running in one terminal and `bun run dev` in another.

## Part 2: Deploy Live (Free)

### Option A: Vercel (Recommended — Easiest)

1. **Push your project to GitHub:**
   ```bash
   git add .
   git commit -m "initial garden"
   git push origin main
   ```

2. **Go to [vercel.com](https://vercel.com)** and sign in with GitHub.

3. **Import your repository** — Vercel auto-detects Next.js.

4. **Set the build command** to:
   ```bash
   bun run publish && bun run build
   ```

5. **Set environment variables** in Vercel:
   - `DATABASE_URL` = `file:./db/garden.db` (or use Vercel Postgres for free)

6. **Deploy.** Your garden is live at `https://your-garden.vercel.app`.

### Option B: GitHub Pages (Completely Free)

1. **Create a GitHub Actions workflow** at `.github/workflows/deploy.yml`:

   ```yaml
   name: Deploy Garden
   
   on:
     push:
       branches: [main]
   
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: oven-sh/setup-bun@v1
         - run: bun install
         - run: bun run db:push
         - run: bun run publish
         - run: bun run build
         - uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./.next/standalone
   ```

2. **Enable GitHub Pages** in your repo settings → Pages → Source: GitHub Actions.

3. **Push to main** — your garden deploys automatically to `https://YOUR_USERNAME.github.io/your-garden/`.

### Option C: Netlify (Free)

1. Push to GitHub.
2. Go to [netlify.com](https://netlify.com) → New site from Git.
3. Build command: `bun run publish && bun run build`
4. Publish directory: `.next`
5. Deploy.

## Part 3: Daily Workflow

Once set up, your daily workflow is:

### Writing new notes

1. Open Obsidian, write a note with `draft: false`.
2. From the terminal:
   ```bash
   bun run publish
   ```
3. Preview locally:
   ```bash
   bun run dev
   ```

### Publishing to live site

```bash
git add .
git commit -m "new notes"
git push origin main
```

If you set up Vercel or GitHub Actions, the site auto-deploys on push. No extra command needed.

### Quick reference

| Command | What it does |
|---------|-------------|
| `bun run dev` | Start local dev server at `localhost:3000` |
| `bun run publish` | Publish all `draft: false` notes to the database |
| `bun run publish:watch` | Auto re-publish on file save |
| `bun run lint` | Check code quality |
| `bun run db:push` | Create/update the database schema |
| `git push` | Deploy to live site (if CI/CD is set up) |

## Part 4: Obsidian Plugins Supported

This garden renders output from these Obsidian plugins:

| Plugin | Code block | What it renders |
|--------|-----------|-----------------|
| [Obsidian Ink](https://github.com/daledesilva/obsidian_ink) | ` ```handdrawn-ink ` / ` ```handwritten-ink ` | Ink drawings as preview images |
| [Contribution Graph](https://github.com/vran-dev/obsidian-contribution-graph) | ` ```contributionGraph ` | GitHub-style heatmap |
| Mermaid (built-in) | ` ```mermaid ` | Flowcharts, sequence diagrams |
| Math (built-in) | `$...$` / `$$...$$` | KaTeX math |

## Part 5: Features

- **Code execution** — Run Python, JS, C++, Go, Rust, and 40+ languages directly in the browser (via Judge0)
- **Media embeds** — Images (curved/modern), audio, video, PDF
- **Wikilinks** — `[[Note]]`, `[[Note|alias]]`, `[[Note#heading]]`, `[[Note#^block]]`
- **Transclusions** — `![[Note]]`, `![[Note#heading]]`, `![[Note#^blockid]]`
- **Callouts** — 12 types + collapsible
- **Graph view** — Interactive force-directed knowledge graph with tag filters
- **Search** — Instant client-side search (⌘K)
- **RSS feed** — `/api/rss`
- **Dark/light theme** — Darkest by default

> [!tip] Need help?
> Check the [[Colophon]] page for the full feature list, or the [[Welcome to the Garden]] note for navigation tips.

See [[Code Execution Playground]], [[Media Embeds Reference]], [[Contribution Graph]].
