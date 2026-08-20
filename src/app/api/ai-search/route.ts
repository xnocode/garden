/**
 * api/ai-search/route.ts — Website AI Search Assistant.
 * Uses Groq Llama-3.3 70B / Gemini with full-text content search, IP rate limiting and key isolation.
 */

import { NextResponse } from "next/server";
import { listNotes, getNote } from "@/lib/notes";
import { geminiUrl } from "@/lib/ai-models";

export const dynamic = "force-dynamic";

// In-memory IP rate limiter (15 requests per IP per hour)
const ipCache = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipCache.get(ip);
  if (!entry || now > entry.resetTime) {
    ipCache.set(ip, { count: 1, resetTime: now + 3600 * 1000 });
    return false;
  }
  if (entry.count >= 15) return true;
  entry.count++;
  return false;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Rate limit reached (15 questions per hour). Please try again later!" },
        { status: 429 }
      );
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Query string is required." }, { status: 400 });
    }

    // 1. Fetch all published notes
    const allNotes = await listNotes();

    // Clean query keywords
    const qClean = query.toLowerCase().replace(/[^a-z0-9\s]/g, "");
    const keywords = qClean.split(/\s+/).filter((w) => w.length > 1);

    // 2. Score notes with full-text search across Title, Tags, Description & Content
    const scoredNotes = await Promise.all(
      allNotes.map(async (summary) => {
        let score = 0;
        const fullNote = await getNote(summary.slug);
        const contentStr = (fullNote?.content || "").toLowerCase();
        const tLower = summary.title.toLowerCase();
        const sLower = summary.slug.toLowerCase();
        const dLower = (summary.description || "").toLowerCase();
        const tagsStr = summary.tags.join(" ").toLowerCase();

        for (const kw of keywords) {
          if (tLower.includes(kw)) score += 15;
          if (sLower.includes(kw)) score += 12;
          if (tagsStr.includes(kw)) score += 10;
          if (dLower.includes(kw)) score += 5;
          if (contentStr.includes(kw)) score += 3;
        }
        return { summary, content: fullNote?.content || summary.description || "", score };
      })
    );

    // Sort by score descending
    scoredNotes.sort((a, b) => b.score - a.score);

    // Take top 5 notes with matching scores
    let topMatching = scoredNotes.filter((s) => s.score > 0).slice(0, 5);
    if (topMatching.length === 0) {
      topMatching = scoredNotes.slice(0, 5);
    }

    const contextBlocks = topMatching.map(
      (item) =>
        `Note Title: "${item.summary.title}"\nSlug/URL: https://gardenx.qzz.io/?p=${item.summary.slug}\nTags: ${item.summary.tags.join(", ")}\nContent Excerpt:\n${item.content.slice(0, 1800)}`
    );

    const contextText = contextBlocks.join("\n\n---\n\n");

    // 3. Dedicated website visitor keys (prioritizes WEBSITE_GROQ_KEY & WEBSITE_GEMINI_KEY)
    const groqKey = (process.env.WEBSITE_GROQ_KEY || process.env.GROQ_API_KEY || "").trim();
    const geminiKey = (process.env.WEBSITE_GEMINI_KEY || process.env.GEMINI_API_KEY || "").trim();

    let aiAnswer = "";

    const systemPrompt = `You are the AI Search Assistant for Ridoy's Digital Garden ("xnocode").
Answer the user's search query accurately using the provided notes from the garden.
Rules:
- Be concise, engaging, and direct.
- Highlight key facts and concepts found in the notes.
- Include markdown links to the notes using format: [Note Title](/?p=slug).
- Use clean Markdown formatting with clear bullet points where helpful.`;

    const userPrompt = `Garden Notes Context:\n${contextText}\n\nUser Search Query: ${query}`;

    // Try Groq Llama-3.3 70B
    if (groqKey) {
      try {
        const gRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 900,
          }),
        });

        if (gRes.ok) {
          const gData = await gRes.json();
          aiAnswer = gData?.choices?.[0]?.message?.content || "";
        }
      } catch (err: any) {
        console.warn("Groq website AI search failed:", err.message);
      }
    }

    // Fallback: Gemini 2.0 Flash
    if (!aiAnswer && geminiKey) {
      try {
        const gemRes = await fetch(
          geminiUrl(geminiKey),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            }),
          }
        );

        if (gemRes.ok) {
          const gemData = await gemRes.json();
          aiAnswer = gemData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
      } catch (err: any) {
        console.warn("Gemini website AI search failed:", err.message);
      }
    }

    if (!aiAnswer) {
      aiAnswer = `Found **${topMatching.length} notes** matching "${query}":\n\n` +
        topMatching.map((n) => `• [${n.summary.title}](/?p=${n.summary.slug})`).join("\n");
    }

    return NextResponse.json({
      answer: aiAnswer,
      sources: topMatching.map((n) => ({ title: n.summary.title, slug: n.summary.slug, tags: n.summary.tags })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
