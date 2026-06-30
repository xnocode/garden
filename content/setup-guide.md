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

> [!warning] GitHub Pages won't work
> This garden uses **API routes** (code execution, search, RSS) and a **database** (Prisma/SQLite). GitHub Pages only serves static files — it can't run server-side code. You **must** use a host that supports Next.js server-side rendering.

### Vercel (Recommended — Free, Easiest)

1. **Push your project to GitHub:**
   ```bash
   git add .
   git commit -m "initial garden"
   git push origin main
   ```

2. **Go to [vercel.com](https://vercel.com)** and sign in with GitHub (free).

3. **Click "Add New" → "Project"** → import your repository.

4. **Vercel auto-detects Next.js.** The `vercel.json` file in the project tells it to run `bun run publish` before building. You don't need to change anything.

5. **Set environment variables** in Vercel (Settings → Environment Variables):
   - `DATABASE_URL` = `file:./db/garden.db`

6. **Click Deploy.** Wait ~2 minutes. Your garden is live at:
   ```
   https://your-garden.vercel.app
   ```

7. **Every time you push to GitHub**, Vercel auto-rebuilds and redeploys. No extra commands needed.

### Adding a Custom Domain (Free)

You can use any domain you own — including free domains from [domain.digitalplat.org](https://domain.digitalplat.org). Here's how:

1. **Get your domain** (e.g., `mygarden.digitalplat.org`) — note the domain name.

2. **Go to your Vercel project** → Settings → Domains.

3. **Enter your domain** (e.g., `mygarden.digitalplat.org`) and click **Add**.

4. **Vercel shows you DNS records to add.** It will look something like:
   ```
   Type:  A
   Name:  @  (or leave blank)
   Value: 76.76.21.21
   
   Type:  CNAME
   Name:  www
   Value: cname.vercel-dns.com
   ```

5. **Go to your domain provider's DNS settings** (for digitalplat.org, log in at [dash.domain.digitalplat.org](https://dash.domain.digitalplat.org/domains)).

6. **Add the DNS records** exactly as Vercel showed you. For a subdomain like `mygarden.digitalplat.org`:
   - Type: `CNAME`
   - Name/Host: `mygarden` (just the subdomain part)
   - Value/Target: `cname.vercel-dns.com`

7. **Wait 5–30 minutes** for DNS to propagate. Vercel automatically detects the DNS change and issues a free SSL certificate.

8. **Your garden is now live at your custom domain** with HTTPS:
   ```
   https://mygarden.digitalplat.org
   ```

> [!tip] DNS propagation
> DNS changes can take up to 48 hours to propagate worldwide, but usually work within 5–30 minutes. You can check propagation at [dnschecker.org](https://dnschecker.org).

> [!info] What if my domain provider doesn't support CNAME?
> If your provider only supports A records, use:
> - Type: `A`
> - Name: `mygarden` (or `@` for root)
> - Value: `76.76.21.21`

> [!tip] Why Vercel?
> Vercel is made by the Next.js team. The free tier includes:
> - Server-side rendering (API routes work)
> - 100GB bandwidth/month
> - Automatic HTTPS
> - Custom domain support (free SSL!)
> - Preview deployments for every branch

### Alternative: Railway (Free tier)

If Vercel doesn't work for you:

1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Add a PostgreSQL database (Railway provides one for free)
4. Set `DATABASE_URL` to the Railway database URL
5. Deploy

### Why NOT GitHub Pages?

GitHub Pages only serves **static HTML/CSS/JS files**. This garden needs:
- **API routes** — `/api/run` (code execution), `/api/search`, `/api/rss`, etc.
- **Server-side database** — Prisma reads from SQLite at request time
- **Server components** — Next.js renders pages on the server

GitHub Pages can't do any of these. You need a host that runs Node.js.

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
