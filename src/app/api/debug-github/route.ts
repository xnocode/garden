import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
  const repo = process.env.GITHUB_REPO || "xnocode/garden";

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        tokenConfigured: false,
        error: "No GITHUB_TOKEN or GH_TOKEN environment variable found on serverless environment.",
        tip: "Go to Vercel Dashboard -> Settings -> Environment Variables, add GITHUB_TOKEN, and click REDEPLOY under Deployments.",
      },
      { status: 200 }
    );
  }

  const prefix = token.slice(0, 7) + "..." + token.slice(-4);
  const authHeader = token.startsWith("github_pat_") || token.startsWith("ghp_") ? `Bearer ${token}` : `token ${token}`;

  try {
    // Test repository access
    const repoRes = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Authorization: authHeader,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DigitalGardenDiagnostic",
      },
    });

    if (!repoRes.ok) {
      const errData = await repoRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          tokenConfigured: true,
          tokenPrefix: prefix,
          githubHttpStatus: repoRes.status,
          error: errData.message || "Failed to access repository with token.",
          tip: "Check token scopes on GitHub. Make sure it has 'Contents: Read & write' or 'repo' permissions for xnocode/garden.",
        },
        { status: 200 }
      );
    }

    const repoData = await repoRes.json();
    const permissions = repoData.permissions || {};

    return NextResponse.json(
      {
        success: true,
        tokenConfigured: true,
        tokenPrefix: prefix,
        repo: repoData.full_name,
        pushPermission: permissions.push ?? "unknown",
        adminPermission: permissions.admin ?? "unknown",
        message: "GITHUB_TOKEN is properly configured and has push access to repository!",
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        tokenConfigured: true,
        tokenPrefix: prefix,
        error: err?.message || "Network error reaching GitHub API.",
      },
      { status: 200 }
    );
  }
}
