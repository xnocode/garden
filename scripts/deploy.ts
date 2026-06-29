/**
 * deploy.ts — One-command live deploy.
 *
 * Usage:
 *   bun run deploy              # publish + commit + push (auto message)
 *   bun run deploy "my notes"   # publish + commit + push (custom message)
 *
 * What it does (in order):
 *   1. Runs `bun run publish` (renders notes to JSON)
 *   2. Runs `git add -A`
 *   3. Runs `git commit -m "..."` (auto or custom message)
 *   4. Runs `git push` (Vercel auto-deploys on push)
 *
 * Prerequisites:
 *   - Git repo initialized with a remote origin (GitHub)
 *   - Vercel connected to your GitHub repo
 */

import { execSync } from "node:child_process";

function run(cmd: string, label: string): boolean {
  console.log(`\n  ▸ ${label}`);
  try {
    const output = execSync(cmd, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    if (output.trim()) {
      console.log(
        output
          .trim()
          .split("\n")
          .map((l) => `    ${l}`)
          .join("\n")
      );
    }
    return true;
  } catch (e: any) {
    const stderr = e.stderr?.toString().trim() || e.message;
    // "nothing to commit" is not a real error
    if (stderr.includes("nothing to commit") || stderr.includes("no changes")) {
      console.log("    (no changes to commit)");
      return true;
    }
    console.error(`    ✗ ${stderr.split("\n")[0]}`);
    return false;
  }
}

async function main() {
  const customMessage = process.argv.slice(2).join(" ");
  const startedAt = Date.now();

  console.log("\n  🚀  Digital Garden — Deploy to Live\n");

  // Step 1: Publish
  console.log("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Step 1/4: Publish notes");
  console.log("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const publishOk = run("bun run publish", "Rendering notes to JSON…");
  if (!publishOk) {
    console.error("\n  ✗ Publish failed. Aborting deploy.\n");
    process.exit(1);
  }

  // Step 2: Git add
  console.log("\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Step 2/4: Stage changes");
  console.log("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  run("git add -A", "Staging files…");

  // Step 3: Git commit
  console.log("\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Step 3/4: Commit");
  console.log("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 16);
  const message = customMessage || `deploy: ${timestamp}`;
  run(`git commit -m "${message.replace(/"/g, '\\"')}"`, `Committing: "${message}"`);

  // Step 4: Git push
  console.log("\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Step 4/4: Push to GitHub (triggers Vercel deploy)");
  console.log("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const pushOk = run("git push", "Pushing to GitHub…");
  if (!pushOk) {
    console.error("\n  ✗ Push failed. Check your git remote and auth.\n");
    process.exit(1);
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log("\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`\n  ✅  Deployed in ${elapsed}s!\n`);
  console.log("  Vercel is building your site now (~1-2 min).");
  console.log("  Check status at: https://vercel.com/dashboard\n");
}

main().catch((e) => {
  console.error("\n  ✗ Deploy failed:", e);
  process.exit(1);
});
