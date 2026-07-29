/**
 * telegram-youtube.ts — YouTube Video to Structured Markdown Note using AI.
 * Supports auto-generated captions, manual subtitles, and metadata fallback.
 */

import { YoutubeTranscript } from "youtube-transcript";

interface YouTubeNoteResult {
  title: string;
  slug: string;
  markdownContent: string;
  tags: string[];
}

export function extractYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

/**
 * Scrapes YouTube page HTML to find auto-generated or manual caption tracks.
 * Works even when standard YoutubeTranscript API library is blocked or fails on auto-captions.
 */
async function fetchCaptionFromPage(videoId: string): Promise<string> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return "";
    const html = await res.text();

    const match = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (!match || !match[1]) return "";

    const captionTracks = JSON.parse(match[1]);
    if (!Array.isArray(captionTracks) || captionTracks.length === 0) return "";

    // Prefer English (en) or auto-generated English (a.en), otherwise pick first available
    const track =
      captionTracks.find((t: any) => t.languageCode === "en" || t.vssId?.includes("en")) ||
      captionTracks[0];

    if (!track || !track.baseUrl) return "";

    const trackUrl = new URL(track.baseUrl);
    if (trackUrl.protocol !== "https:") return "";

    const xmlRes = await fetch(trackUrl.toString());
    if (!xmlRes.ok) return "";
    const xml = await xmlRes.text();

    // Iteratively strip XML/HTML tags safely
    let cleanText = xml
      .replace(/<text[^>]*>/gi, " ")
      .replace(/<\/text>/gi, " ");

    let prev = "";
    while (cleanText !== prev) {
      prev = cleanText;
      cleanText = cleanText.replace(/<[^>]+>/g, " ");
    }

    cleanText = cleanText
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

    return cleanText;
  } catch (err: any) {
    console.warn("YouTube page caption scrape error:", err.message);
    return "";
  }
}

export async function processYouTubeToNote(youtubeUrl: string): Promise<YouTubeNoteResult> {
  const videoId = extractYouTubeVideoId(youtubeUrl);
  if (!videoId) {
    throw new Error("Invalid YouTube URL. Please provide a valid YouTube link.");
  }

  // 1. Fetch metadata (Title & Channel) via free YouTube oEmbed
  let videoTitle = "YouTube Note";
  let channelName = "";
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (oembedRes.ok) {
      const info = await oembedRes.json();
      videoTitle = info.title || videoTitle;
      channelName = info.author_name || "";
    }
  } catch (err: any) {
    console.warn("YouTube oEmbed failed:", err.message);
  }

  // 2. Fetch transcript with multi-level fallback (supports auto-generated captions!)
  let fullTranscript = "";
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    if (items && items.length > 0) {
      fullTranscript = items.map((i) => i.text).join(" ").replace(/\s+/g, " ").trim();
    }
  } catch (err: any) {
    console.warn("YoutubeTranscript library failed, trying timedtext fallback:", err.message);
  }

  // Fallback to page scraper if library returned empty
  if (!fullTranscript) {
    fullTranscript = await fetchCaptionFromPage(videoId);
  }

  const hasTranscript = Boolean(fullTranscript);
  const truncatedTranscript = hasTranscript ? fullTranscript.slice(0, 120000) : "";

  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || "").trim();
  const groqKey = (process.env.GROQ_API_KEY || "").trim();

  let structuredData: { title?: string; body?: string; tags?: string[] } | null = null;

  const prompt = hasTranscript
    ? `You are an expert educator and technical note-taker. 
The user wants to LEARN THE SKILL or CONCEPT in this video ("${videoTitle}" by ${channelName}) WITHOUT HAVING TO WATCH THE VIDEO.

CRITICAL REQUIREMENT ON LENGTH & DEPTH:
- Do NOT briefly summarize or skip details.
- Match the length and depth of your note to the complexity of the video. If the video is long or covers multiple topics, write an exhaustive, deep-dive, fully comprehensive study guide covering EVERY concept, sub-topic, formula, code example, and practical technique explained by the creator.
- Ensure the reader clears ALL concepts taught in the video and masters the skill completely just by reading this note.

Structuring Guidelines:
1. "title": A clear, educational, descriptive title.
2. "body": Write an extensive, self-contained Markdown guide with rich sections:
   - ## 💡 Core Concept & Big Picture (What it is, why it matters, main goal)
   - ## 📘 Complete Concept Breakdown & Deep Dive (Cover EVERY topic, section, formula, code snippet, or mechanism mentioned in the video in full detail)
   - ## 🔑 Key Takeaways & Pro Tips (Crucial principles, gotchas, or advice from the creator)
   - ## ⚡ Actionable Summary & Practice Guide (Step-by-step implementation guide)
3. "tags": 2 to 4 relevant single-word lowercase tags.

Return ONLY valid JSON matching this schema:
{
  "title": "Educational Note Title",
  "body": "Markdown text with headings...",
  "tags": ["tag1", "tag2"]
}

Transcript:
${truncatedTranscript}`
    : `You are an expert educator. Create a comprehensive educational study guide for the topic covered in the YouTube video titled "${videoTitle}" by ${channelName}.
The goal is to teach the concept clearly so the reader understands it completely without watching the video. Provide an extensive deep dive covering key principles, mechanisms, and practical steps.

Structure:
- ## 💡 Core Concept & Overview
- ## 📘 Key Principles & Deep Dive
- ## ⚡ Practical Application & Summary

Return ONLY valid JSON matching this schema:
{
  "title": "Educational Note Title",
  "body": "Markdown text with headings...",
  "tags": ["tag1", "tag2"]
}`;

  // 3. Process with Gemini 2.0 Flash
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.3,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          structuredData = JSON.parse(rawJson);
        }
      }
    } catch (err: any) {
      console.warn("Gemini YouTube note processing failed:", err.message);
    }
  }

  // 4. Fallback: Groq Llama 3.3 70B
  if (!structuredData && groqKey) {
    try {
      const llamaRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 8000,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are an expert notes summarizer. Return ONLY JSON matching {"title": "Title", "body": "Markdown body", "tags": ["tag1"]}`,
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (llamaRes.ok) {
        const lData = await llamaRes.json();
        const content = lData?.choices?.[0]?.message?.content;
        if (content) {
          structuredData = JSON.parse(content);
        }
      }
    } catch (err: any) {
      console.warn("Groq Llama YouTube summary failed:", err.message);
    }
  }

  const title = (structuredData?.title || videoTitle).trim();
  const defaultBody = hasTranscript
    ? fullTranscript.slice(0, 1000) + "..."
    : `## Overview\nThis is a reference note for the video **[${videoTitle}](${youtubeUrl})** by **${channelName || "YouTube Creator"}**.\n\n*Note: Video transcript was auto-indexed.*`;

  const bodyText = (structuredData?.body || defaultBody).trim();
  const tags = Array.isArray(structuredData?.tags) && structuredData.tags.length > 0
    ? structuredData.tags.map((t) => t.replace(/^#/, "").toLowerCase().trim())
    : ["youtube", "summary"];

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `youtube-note-${Date.now()}`;

  const today = new Date().toISOString().split("T")[0];
  const tagList = tags.map((t) => `  - ${t}`).join("\n");

  const headerInfo = channelName
    ? `> 🎥 **Source Video:** [${videoTitle}](${youtubeUrl}) (${channelName})\n\n`
    : `> 🎥 **Source Video:** [${videoTitle}](${youtubeUrl})\n\n`;

  const markdownContent = `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndraft: false\nauthor: Ridoy\ndate: ${today}\ntags:\n${tagList}\n---\n\n${headerInfo}${bodyText}\n`;

  return {
    title,
    slug,
    markdownContent,
    tags,
  };
}
