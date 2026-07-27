/**
 * api/ai-search/route.ts — Website AI Search Assistant.
 * Uses Groq Llama-3.3 70B / Gemini with IP rate limiting and key isolation.
 */

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Simple in-memory IP rate limiter (10 requests per IP per hour)
const ipCache = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipCache.get(ip);
  if (!entry || now > entry.resetTime) {
    ipCache.set(ip, { count: 1, resetTime: now + 3600 * 1000 });
    return false;
  }
  if (entry.count >= 10) return true;
  entry.count++;
  return false;
}

interface NoteIndex {
  slug: string;
  title: string;
  description: string | null;
  tags: string[];
  path: string;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Rate limit reached (10 questions per hour). Please try again later!" },
        { status: 429 }
      );
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Query string is required." }, { status: 400 });
    }

    // 1. Read published search index
    const indexPath = path.join(process.cwd(), "src", "data", "search-index.json");
    let notes: NoteIndex[] = [];
    if (fs.existsSync(indexPath)) {
      const raw = fs.readFileSync(indexPath, "utf-8");
      const parsed = JSON.parse(raw);
      notes = parsed.notes || [];
    }

    // 2. Simple keyword filter to get top matching note titles
    const qLower = query.toLowerCase();
    const keywords = qLower.split(/\s+/).filter((w) => w.length > 2);

    const scoredNotes = notes.map((note) => {
      let score = 0;
      const tLower = note.title.toLowerCase();
      const dLower = (note.description || "").toLowerCase();
      const tagsStr = note.tags.join(" ").toLowerCase();

      for (const kw of keywords) {
        if (tLower.includes(kw)) score += 5;
        if (dLower.includes(kw)) score += 2;
        if (tagsStr.includes(kw)) score += 3;
      }
      return { note, score };
    });

    scoredNotes.sort((a, b) => b.score - a.score);
    const topNotes = scoredNotes.slice(0, 6).map((s) => s.note);

    const contextText = topNotes
      .map(
        (n) =>
          `Title: "${n.title}"\nURL: https://gardenx.qzz.io/?p=${n.slug}\nTags: ${n.tags.join(", ")}\nSummary: ${n.description || "Digital garden note"}`
      )
      .join("\n\n");

    // 3. Dedicated website visitor keys (prioritizes WEBSITE_GROQ_KEY & WEBSITE_GEMINI_KEY)
    const groqKey = (process.env.WEBSITE_GROQ_KEY || process.env.GROQ_API_KEY || "").trim();
    const geminiKey = (process.env.WEBSITE_GEMINI_KEY || process.env.GEMINI_API_KEY || "").trim();

    let aiAnswer = "";

    const systemPrompt = `You are the AI Search Assistant for Ridoy's Digital Garden ("xnocode").
Answer the user's search query concisely and accurately based on the provided digital garden notes.
Rules:
- Be concise, engaging, and direct.
- Always include markdown links to matching notes using format: [Note Title](/?p=slug).
- If context is found, summarize key insights from the notes.
- Use standard Markdown formatting.`;

    const userPrompt = `Context Notes from Garden:\n${contextText || "No direct matching notes found."}\n\nUser Question: ${query}`;

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
            max_tokens: 800,
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
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
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
      aiAnswer = `Found **${topNotes.length} notes** matching "${query}":\n\n` +
        topNotes.map((n) => `• [${n.title}](/?p=${n.slug})`).join("\n");
    }

    return NextResponse.json({
      answer: aiAnswer,
      sources: topNotes.map((n) => ({ title: n.title, slug: n.slug })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
