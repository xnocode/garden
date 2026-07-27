---
title: Moving the Garden to a New Laptop
description: A personal reference for setting up the digital garden project on a new machine — including WSL, Taskwarrior, and environment secrets.
draft: true
author: Ridoy
date: 2026-07-27
tags:
  - meta
  - setup
  - reference
---

Everything is in GitHub, so moving to a new laptop is straightforward. Here's the full checklist.

## What lives where

| What | Location | Backed up? |
|------|----------|------------|
| All code & notes | GitHub repo | ✅ Always |
| Site design & components | GitHub repo | ✅ Always |
| Vercel hosting config | Vercel (linked to GitHub) | ✅ Always |
| `.env.local` secrets | Local machine only | ⚠️ Copy manually |
| Taskwarrior tasks | WSL `~/.task/` | ⚠️ Copy manually |

## Setup steps

### 1. Install tools on the new machine

```powershell
# Bun (runtime for scripts)
powershell -c "irm bun.sh/install.ps1 | iex"

# Node.js — https://nodejs.org (LTS)
# Git — https://git-scm.com
```

### 2. Install WSL + Taskwarrior

```powershell
wsl --install
```

Then inside WSL:

```bash
sudo apt update && sudo apt install taskwarrior -y
```

### 3. Migrate Taskwarrior data

On the **old laptop** (WSL):

```bash
cp -r ~/.task /mnt/c/Users/YourName/task-backup
```

On the **new laptop** (WSL):

```bash
cp -r /mnt/c/Users/YourName/task-backup ~/.task
```

### 4. Clone the repository

```powershell
git clone https://github.com/your-username/garden d:\garden
cd d:\garden
bun install
```

### 5. Restore secrets

Copy `.env.local` from the old machine to `d:\garden/.env.local`.

This file contains database URLs, GitHub tokens, and any other API keys. **Never commit this file.**

### 6. Test the deploy

```powershell
bun run deploy
```

If all 5 steps complete and Vercel builds successfully, the setup is done.

## That's it

The entire project restores in under 5 minutes. The only manual steps are the two files not in version control: `.env.local` and `~/.task/`.
