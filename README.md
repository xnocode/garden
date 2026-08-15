# 🌱 Garden

> *A personal digital garden — a quiet place to think, write, and grow ideas in public.*

**Live site:** [gardenx.qzz.io](https://gardenx.qzz.io)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql)
![Bun](https://img.shields.io/badge/Runtime-Bun-000?logo=bun)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000?logo=vercel)

---

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Content Pipeline](#-content-pipeline)
- [Note Visibility Model](#-note-visibility-model)
- [Authentication & Security](#-authentication--security)
- [Email Infrastructure](#-email-infrastructure)
- [Integrations](#-integrations)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Writing Content](#-writing-content)
- [Deployment](#-deployment)
- [Scripts Reference](#-scripts-reference)
- [API Reference](#-api-reference)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 🌿 About the Project

Garden is a personal knowledge space — somewhere between a notebook, a blog, and a mind map. It's not sorted by date or polished for an audience. Instead, it's a living collection of notes that grow and connect over time.

Some notes are complete essays. Others are rough seedlings still taking shape. That's intentional — a garden is never truly *finished*.

Under the hood, it's a fully static, high-performance publishing system that transforms an [Obsidian](https://obsidian.md) vault into a blazing-fast website — with wikilinks, backlinks, a knowledge graph, LaTeX math, Mermaid diagrams, code execution, membership, comments, and AI-powered search. Private notes stay private: they're never committed to git and are served only to the garden's owner.

### What's Inside

| Section | What You'll Find |
|---|---|
| 📝 **Essays** | Long-form thoughts on knowledge, writing, memory, and the mind |
| 💻 **C++ / DSA** | Programming references and competitive programming notes |
| 🐍 **Python** | Language deep-dives, experiments, and code explorations |
| 🤖 **AI & ML** | Machine learning concepts, prerequisite maps, and ideas |
| 🎓 **University** | Course notes and lab indexes (4th semester track) |
| 🪴 **Personal** | Reflections, dreams, things I want to explore — the unstructured side |
| 🗺️ **Meta Notes** | Notes *about* the garden itself — how it's built and why it exists |

---

## ✨ Key Features

### Reading Experience
- 📄 **Fully static pages** — pre-rendered HTML from markdown, zero server round-trips on navigation
- ⚡ **Client-side routing** — instant page transitions with a custom garden router
- 🔍 **Full-text search** — FlexSearch-powered command palette (`Ctrl+K`)
- 🕸️ **Interactive knowledge graph** — visual map of how every note connects
- 🔗 **Wikilinks & backlinks** — click `[[linked terms]]` and follow the thread; see every note that references the current one
- 🏷️ **Tag browsing** — notes grouped by theme and topic
- 📚 **Table of contents, reading progress, reading history** — for long-form comfort
- 🎲 **Wander button** — jump to a random note and get lost on purpose
- 📅 **On this day** — revisit notes from the same date in past seasons
- 🌗 **Dark / light theme** — persisted across visits
- 📱 **Fully responsive** — dedicated mobile sidebar and touch-friendly layout

### Rich Content Support
- 🧮 **LaTeX math** via KaTeX (inline `$...$` and block `$$...$$`)
- 📊 **Mermaid diagrams** rendered client-side
- 🎨 **Syntax-highlighted code blocks** (Shiki) with a **live code runner** for JavaScript/Python snippets
- ⚠️ **Obsidian callouts** (`> [!note]`, `> [!warning]`, …)
- 📎 **Media embeds** — YouTube, Google Drive/Docs/Slides, and generic oEmbeds
- 🔗 **URL previews** with auto-generated link cards
- 🧩 **Transclusions** — embed one note inside another

### Membership & Community
- ✉️ **Email + password accounts** with mandatory email verification (OTP code + one-click link)
- 🔐 **Forgot-password flow** with single-use, time-limited reset links
- 💬 **Nested comments** on notes (members only)
- 🚪 **Members-only notes** — gated content for signed-in, verified members
- 🛡️ **Trusted-provider registration** — Gmail, Outlook, Yahoo, iCloud, Proton; `.edu` and disposable domains blocked

### Owner Tools
- 👑 **Env-based admin** — the owner's account lives only in environment variables, never in the database
- 🔒 **Private notes** — admin-only content that never touches the public repo or static bundle
- 🤖 **Telegram bot integration** — post notes, dump links, voice memos, PDFs, and daily digests from chat
- ✅ **Taskwarrior export** — published task snapshots
- 🧠 **AI search** — natural-language Q&A over the entire garden (Gemini)
- 📈 **Analytics** — Google Analytics data surfaced on-site
- 🗓️ **Contribution graph & writing rhythm** — GitHub-style activity visualization

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, `force-static`) |
| UI | [React 19](https://react.dev), [Tailwind CSS 4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com), Radix primitives, Framer Motion |
| Language | [TypeScript 5](https://www.typescriptlang.org) |
| Runtime & Tooling | [Bun](https://bun.sh) |
| Database | [PostgreSQL](https://www.postgresql.org) on [Neon](https://neon.tech) via [Prisma 6](https://www.prisma.io) |
| Auth | [NextAuth v4](https://next-auth.js.org) — credentials provider, JWT sessions |
| Email | [Resend](https://resend.com) REST API (no SDK, plain fetch) |
| Content | Obsidian vault → custom markdown pipeline (unified/remark/rehype ecosystem) |
| Search | [FlexSearch](https://github.com/nextapps-de/flexsearch) |
| Hosting | [Vercel](https://vercel.com) |
| DNS | Cloudflare |
| Analytics | Google Analytics + GA Data API |
| AI | Google Gemini (AI search, Telegram features) |

---

## 🏗 Architecture

The site is **fully static** (`src/app/page.tsx` is `force-static`). All navigation happens client-side — pages are pre-rendered JSON payloads, so browsing the garden costs zero server round-trips.

```
┌─────────────┐     publish.ts      ┌──────────────┐        ┌──────────────┐
│  Obsidian    │ ──────────────────▶ │  src/data/   │ ─────▶ │   Vercel     │
│  vault       │  render + wikilinks │  *.json      │  git   │  static site │
│  (content/)  │        │            │  (static)    │  push  └──────────────┘
└─────────────┘        ▼                    ▲
                 ┌──────────────┐            │
                 │ Neon Postgres│  private notes ONLY
                 │ (Prisma)     │───▶ served via API to
                 └──────────────┘     authenticated admin
```

1. **Author** writes markdown in the Obsidian vault (`content/`)
2. **`scripts/publish.ts`** parses frontmatter, resolves wikilinks, renders HTML, and exports static JSON bundles (`notes.json`, `graph.json`, etc.) into `src/data/`
3. Private notes are **excluded from JSON** and **untracked from git** — they only sync to the database
4. **`bun run deploy`** publishes, protects private notes, commits, and pushes — Vercel auto-deploys
5. Dynamic bits (auth, comments, private-note serving, AI search, webhooks) run as API routes on Vercel

---

## 📁 Project Structure

```
garden/
├── content/                    # Obsidian vault (source of truth)
│   └── *.md                    # notes with YAML frontmatter
├── scripts/
│   ├── publish.ts              # vault → static JSON + DB sync
│   ├── deploy.ts               # full deploy pipeline
│   ├── sync-drafts.ts          # git protection for private notes
│   ├── export-tasks.ts         # Taskwarrior snapshot
│   └── telegram-*.ts           # Telegram webhook handlers
├── prisma/
│   └── schema.prisma           # User, Note, Comment, tokens, Draft
├── src/
│   ├── app/
│   │   ├── page.tsx            # force-static entry — the whole garden
│   │   ├── layout.tsx          # fonts, analytics, theme
│   │   ├── verify-email/       # one-click verification landing page
│   │   ├── reset-password/     # password reset landing page
│   │   ├── sitemap.ts          # static sitemap
│   │   └── api/
│   │       ├── auth/           # register, verify, resend, reset, nextauth
│   │       ├── notes/          # note serving (static + admin-private)
│   │       ├── comments/       # nested comments CRUD
│   │       ├── ai-search/      # Gemini-powered Q&A
│   │       ├── graph|search|tags|random|rss|sitemap/
│   │       ├── webhooks/       # telegram + github
│   │       ├── admin/          # owner-only endpoints
│   │       └── life-quests|tasks|run/  # life-RPG + taskwarrior
│   ├── components/
│   │   ├── garden/             # note view, graph, explorer, palette, …
│   │   ├── auth/               # auth modal (sign in / verify / reset)
│   │   ├── admin/              # quick post
│   │   └── ui/                 # shadcn/ui primitives
│   ├── lib/
│   │   ├── auth.ts             # NextAuth config, PBKDF2 hashing, admin gate
│   │   ├── verification.ts     # OTP + link tokens (SHA256 at rest)
│   │   ├── password-reset.ts   # single-use reset tokens
│   │   ├── mailer.ts           # Resend sender + branded templates
│   │   ├── markdown.ts         # full Obsidian-flavored markdown renderer
│   │   ├── notes.ts            # static note loading
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── email-validator.ts  # trusted-domain policy
│   │   └── telegram-*.ts       # bot command handlers
│   └── data/                   # generated static JSON (do not edit)
├── AGENTS.md                   # agent workflow instructions
└── README.md
```

---

## 🔄 Content Pipeline

```bash
content/*.md  ──▶  parse frontmatter  ──▶  resolve [[wikilinks]]  ──▶
render HTML (remark/rehype, KaTeX, Shiki)  ──▶  export src/data/*.json
                                              └─▶  sync all notes to Neon DB
```

- **Two-pass rendering** — pass 1 collects all slugs/aliases, pass 2 resolves links so forward references work
- **Assets** (images) are copied and optimized
- **Watch mode**: `bun run publish:watch` re-publishes as you edit in Obsidian
- Every note gets: slug, title, description, tags, aliases, links (with existence check), word count, and pre-rendered HTML

---

## 🔒 Note Visibility Model

There is no draft state — every note publishes. Visibility is controlled by frontmatter:

| Visibility | In static JSON | On GitHub | Who can read |
|---|---|---|---|
| `public` (default) | ✅ | ✅ | Everyone |
| `members` | ✅ | ✅ | Signed-in verified members |
| `private` | ❌ | ❌ (git-untracked) | **Admin only**, served from DB via API |

Private notes are removed from the git index by `sync-drafts.ts` before every commit, so they never leave the machine. When an admin opens a private note, the client router transparently fetches it from `/api/notes/[slug]`, which verifies the admin session server-side and reads from PostgreSQL. Non-admins simply get a 404 — the note's existence is never revealed.

```yaml
---
title: My Private Thought
visibility: private
---
```

---

## 🔐 Authentication & Security

- **Credentials-only sign-in** (email + password) with JWT sessions (30 days)
- **Mandatory email verification** — new accounts must enter a 6-digit OTP or click an emailed link before signing in
- **Passwords are never recoverable** — stored as `salt:hash` using PBKDF2-SHA512 (1000 iterations, 64-byte keys). Even the database owner cannot read them
- **Password reset** — single-use tokens, SHA256-hashed at rest, 15-minute expiry, identical responses for existing/non-existing accounts (no email enumeration)
- **Trusted-domain registration policy** — blocks disposable and `.edu` providers
- **Admin is env-only** — the owner's credentials live solely in environment variables (`ADMIN_EMAIL` / `ADMIN_PASSWORD`); there is no admin row in the database, making the admin path impossible to attack through the DB or OAuth
- **Role integrity** — regular sign-ups are always `member`; only the env-based path grants `admin`

### Verification & Reset Flow

```
signup ──▶ account created (unverified) ──▶ OTP + link emailed
  │                                            │
  │  6-digit code (15 min)  ◀──────────────────┤
  │  or click /verify-email?token=…            │
  ▼                                            ▼
enter code in modal ──────────────▶ marked verified ──▶ auto sign-in

forgot password ──▶ /reset-password?token=… emailed (single-use, 15 min)
                        └─▶ set new password ──▶ old token burned
```

---

## 📧 Email Infrastructure

Transactional email is sent through the **Resend** REST API with a plain `fetch` — no SDK dependency.

| Email | Trigger | Contents |
|---|---|---|
| Verification | Account creation / resend | 6-digit OTP + one-click verify link + spam-folder hint |
| Password reset | Forgot-password request | Single-use reset link + spam-folder hint |

- Emails are branded with a consistent HTML template (🌱 Garden header/footer)
- Without `RESEND_API_KEY` the system degrades gracefully — messages are logged to the server console instead of sent, so local dev still works
- SPF, DKIM, and DMARC are configured on the sending domain; new domains should expect spam-folder placement until reputation builds

---

## 🔌 Integrations

| Integration | What it does |
|---|---|
| 🤖 **Telegram bot** | Post notes from chat (`/post`), capture links & voice memos, PDF extraction, `/ask` AI Q&A, daily digests |
| 🧠 **AI search** | Natural-language questions answered from garden content (Gemini 2.0 Flash) |
| ✅ **Taskwarrior** | `export-tasks.ts` snapshots pending/completed tasks into the site |
| 🐙 **GitHub webhook** | Trigger actions on repo events |
| 📈 **Google Analytics** | Visitor stats via GA Data API |
| 🎮 **Life RPG** | Gamified quests engine (`life-quests` API) |
| 📮 **RSS + Sitemap** | Auto-generated from published notes |

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.3+
- Node.js 20+ (for tooling compatibility)
- A PostgreSQL database (Neon free tier works great)
- A Resend account (for email verification — optional in dev)

### Install

```bash
git clone <repo-url> garden
cd garden
bun install          # also runs prisma generate
```

### Configure

```bash
cp .env.example .env
# fill in DATABASE_URL at minimum (see table below)
bun run db:push      # create tables
```

### Run

```bash
bun run dev          # dev server on http://localhost:3000
bun run publish      # (re)build static JSON from the vault
```

> **Note:** The site reads from `src/data/*.json`. Run `bun run publish` once before `dev`/`build` or the garden will be empty.

### Production build

```bash
bun run build        # prisma generate + next build
bun run start        # standalone server
```

---

## 🔑 Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Prisma) |
| `NEXTAUTH_URL` | ✅ | Site origin, e.g. `https://gardenx.qzz.io` |
| `NEXTAUTH_SECRET` | ✅ | JWT signing secret |
| `ADMIN_EMAIL` | ✅ | Owner login email (env-only admin) |
| `ADMIN_PASSWORD` | ✅ | Owner login password |
| `RESEND_API_KEY` | ✅* | Resend API key for sending emails |
| `EMAIL_FROM` | ➖ | From header, e.g. `Garden <no-reply@yourdomain>` |
| `GEMINI_API_KEY` | ➖ | AI search + Telegram AI features |
| `TELEGRAM_BOT_TOKEN` | ➖ | Telegram bot |
| `TELEGRAM_CHAT_ID` | ➖ | Authorized Telegram chat |
| `GITHUB_WEBHOOK_SECRET` | ➖ | GitHub webhook verification |
| `NEXT_PUBLIC_GA_ID` | ➖ | Google Analytics measurement ID |
| `GA_PROPERTY_ID` / `GA_CLIENT_EMAIL` / `GA_PRIVATE_KEY` | ➖ | GA Data API (on-site stats) |

\* Optional locally — without it, emails are logged to console instead of sent. **Required in production** for account verification.

---

## ✍️ Writing Content

Notes are plain markdown files in `content/` with optional YAML frontmatter:

```markdown
---
title: On Thinking
description: Slow thoughts about how ideas form
tags: [essay, thinking]
visibility: public        # public | members | private
date: 2026-08-15
---

An idea is a seedling — [[links are thoughts]] connect it to the rest.

> [!tip]
> Callouts work just like in Obsidian.

$$e^{i\pi} + 1 = 0$$
```

**Supported syntax:** wikilinks `[[Note]]`, aliases, embeds/transclusions `![[Note]]`, callouts, LaTeX (KaTeX), Mermaid diagrams, code blocks with live execution, tables, task lists, footnotes, image galleries, and YouTube/Drive embeds.

New notes appear on the site after `bun run publish` (or automatically on the next `bun run deploy`).

---

## 🚢 Deployment

Deploying is one command:

```bash
bun run deploy
```

The pipeline (`scripts/deploy.ts`) runs:

1. **Sync** — pull latest from GitHub
2. **Publish** — render vault → static JSON + DB sync
3. **Export tasks** — Taskwarrior snapshot
4. **Protect private notes** — untrack `visibility: private` files from git
5. **Commit & push** — Vercel auto-detects the push and builds

Private-note protection uses `.git/info/exclude` (local-only ignore), so the exclusion rules themselves are never committed either.

---

## 📜 Scripts Reference

| Command | Description |
|---|---|
| `bun run dev` | Local dev server (port 3000) |
| `bun run build` | Prisma generate + production build |
| `bun run start` | Serve the standalone production build |
| `bun run publish` | Render vault → static JSON + sync DB |
| `bun run publish:watch` | Re-publish on file change |
| `bun run deploy` | Full publish → protect → commit → push pipeline |
| `bun run db:push` | Push Prisma schema to the database |
| `bun run db:migrate` | Create/apply a dev migration |
| `bun run lint` | ESLint |

---

## 🌐 API Reference

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/auth/register` | POST | — | Create account, send verification |
| `/api/auth/verify-email` | POST | — | Verify via OTP or link token |
| `/api/auth/resend-verification` | POST | — | Re-send OTP (cooldown enforced) |
| `/api/auth/verify-status` | GET | — | Account exists / verified check |
| `/api/auth/forgot-password` | POST | — | Email a reset link |
| `/api/auth/reset-password` | GET/POST | — | Validate token / set new password |
| `/api/auth/[...nextauth]` | * | — | NextAuth (signin, session, signout) |
| `/api/notes` | GET | — | Public + members note index |
| `/api/notes/[slug]` | GET | admin | Static notes; private notes admin-only |
| `/api/comments` | GET/POST | member | Nested comments per note |
| `/api/search` / `/api/search-index` | GET | — | Full-text search |
| `/api/graph` | GET | — | Note graph data |
| `/api/tags` | GET | — | Tag index |
| `/api/random` | GET | — | Random note |
| `/api/rss` / `/api/sitemap` | GET | — | Feed + sitemap |
| `/api/ai-search` | POST | — | Gemini Q&A over the garden |
| `/api/webhooks/telegram` | POST | token | Telegram bot commands |
| `/api/webhooks/github` | POST | secret | GitHub events |
| `/api/admin/*` | * | admin | Owner-only operations |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+K` / `⌘K` | Open command palette / search |
| `Esc` | Close palette / modal |
| `←` `→` | Navigate within note history |

---

## 🗺 Roadmap

- [ ] Google OAuth sign-in (deferred — enable steps ready when wanted)
- [ ] Admin dashboard with member stats (signups, verification, comments)
- [ ] Newsletter / email subscriptions
- [ ] Public profile pages for members
- [ ] Note version history & changelog timeline

---

## 📄 License

Private project — all rights reserved. The content in `content/` is the author's personal writing and may not be reproduced without permission.

---

> *If a note feels incomplete, it probably is. That's the texture of a garden — things are always mid-growth.* 🌱
