# 🌱 Garden

> A personal digital garden — a quiet place to think, write, and grow ideas in public.

**Live:** [gardenx.qzz.io](https://gardenx.qzz.io)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000?logo=vercel)

---

## About

Garden turns an Obsidian vault into a fast, fully static website — with wikilinks, backlinks, a knowledge graph, LaTeX math, Mermaid diagrams, and a live code runner. It supports verified member accounts, comments, members-only notes, and truly private notes that never touch the public repo.

## Features

- **Fully static** — client-side routing, zero server round-trips on navigation
- **Obsidian-flavored markdown** — wikilinks, backlinks, transclusions, callouts, math, diagrams
- **Knowledge graph** — interactive map of how every note connects
- **Member accounts** — email verification (OTP + link) and password reset via email
- **Visibility control** — `public`, `members`, or `private` (admin-only, never committed to git)
- **Integrations** — Telegram bot for publishing, AI search, Taskwarrior, analytics

## Tech Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Prisma + Neon Postgres · NextAuth · Resend · Bun · Vercel

## Getting Started

```bash
bun install          # also runs prisma generate
cp .env.example .env # fill in DATABASE_URL + auth secrets
bun run db:push      # create tables
bun run publish      # build static JSON from the vault
bun run dev          # http://localhost:3000
```

## Deploy

```bash
bun run deploy       # publish → protect private notes → commit → push
```

Vercel auto-deploys on push.

## License

Private project — all rights reserved.
