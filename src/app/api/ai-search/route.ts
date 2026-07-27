/**
 * api/ai-search/route.ts — Website AI Search Assistant.
 * Uses Groq Llama-3.3 70B / Gemini with IP rate limiting and key isolation.
 */

import { NextResponse } from "next/server";
import { listNotes, getNote } from "@/lib/notes";

export const dynamic = "force-dynamic";

// Simple in-memory IP rate limiter (15 requests per IP per hour)
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

    // 1. Fetch all published notes from garden notes engine
    const allNotes = await listNotes();

    // Clean query keywords (strip punctuation like ?)
    const qClean = query.toLowerCase().replace(/[^a-z0-9\s]/g, "");
    const keywords = qClean.split(/\s+/).filter((w) => w.length > 1);

    // 2. Score notes by relevance
    const scoredNotes = allNotes.map((note) => {
      let score = 0;
      const tLower = note.title.toLowerCase();
      const sLower = note.slug.toLowerCase();
      const dLower = (note.description || "").toLowerCase();
      const tagsStr = note.tags.join(" ").toLowerCase();

      for (const kw of keywords) {
        if (tLower.includes(kw)) score += 10;
        if (sLower.includes(kw)) score += 8;
        if (tagsStr.includes(kw)) score += 6;
        if (dLower.includes(kw)) score += 3;
      }
      return { note, score };
    });

    // Sort by score descending
    scoredNotes.sort((a, b) => b.score - a.score);

    // Take top 6 notes (or top 6 default if no score matches)
    let topMatching = scoredNotes.filter((s) => s.score > 0).slice(0, 6).map((s) => s.note);
    if (topMatching.length === 0) {
      topMatching = allNotes.slice(0, 6);
    }

    // Load full contents for top 5 matching notes so AI has exact details
    const contextBlocks: string[] = [];
    for (const note of topMatching.slice(0, 5)) {
      const fullNote = await getNote(note.slug);
      const excerpt = fullNote?.content ? fullNote.content.slice(0, 1500) : note.description || "";
      contextBlocks.push(
        `Note Title: "${note.title}"\nSlug/URL: https://gardenx.qzz.io/?p=${note.slug}\nTags: ${note.tags.join(", ")}\nContent:\n${excerpt}`
      );
    }

    const contextText = contextBlocks.join("\n\n---\n\n");

    // 3. AI keys (prioritizes WEBSITE_GROQ_KEY & WEBSITE_GEMINI_KEY)
    const groqKey = (process.env.WEBSITE_GROQ_KEY || process.env.GROQ_API_KEY || "").trim();
    const geminiKey = (process.env.WEBSITE_GEMINI_KEY || process.env.GEMINI_API_KEY || "").trim();

    let aiAnswer = "";

    const systemPrompt = `You are the AI Search Assistant for Ridoy's Digital Garden ("xnocode").
Answer the user's search query accurately using the provided notes from the garden.
Rules:
- Be concise, engaging, and direct.
- Highlight key facts and concepts found in the notes.
- Include markdown links to the notes using format: [Note Title](/?p=slug).
- Use standard Markdown formatting.`;

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
      aiAnswer = `Found **${topMatching.length} notes** matching "${query}":\n\n` +
        topMatching.map((n) => `• [${n.title}](/?p=${n.slug})`).join("\n");
    }

    return NextResponse.json({
      answer: aiAnswer,
      sources: topMatching.map((n) => ({ title: n.title, slug: n.slug })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
