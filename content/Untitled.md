## 🚀 Setup Guide (for GitHub users)

### 1. Prerequisites
- **[Bun](https://bun.sh)** (recommended) or Node.js 18+
- **Git**

### 2. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/second-brain.git
cd second-brain
bun install
```

### 3. Environment Setup
```bash
cp .env.example .env
```
That's it! The project uses **SQLite** (zero external services). The default `.env` works out of the box.

### 4. Database Setup
```bash
bun run db:push
```
This creates the SQLite database at `db/custom.db`.

### 5. Add Your Content
Put your Obsidian markdown files in the `content/posts/` folder:
```bash
# Your .md files go here:
content/posts/
  my-first-post.md
  another-article.md
  ...
```

### 6. Run Locally
```bash
bun run dev
```
Open **http://localhost:3000** in your browser.

### 7. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```
Set the environment variable on Vercel:
```
DATABASE_URL=file:./db/custom.db
```

---

**That's it — zero external services required.** No Redis, no MySQL, no API keys needed. Just clone, install, and run. 🎯