/**
 * telegram-youtube.ts — YouTube Video to Structured Markdown Note using AI.
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

  // 2. Fetch transcript
  let fullTranscript = "";
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    fullTranscript = items.map((i) => i.text).join(" ").replace(/\s+/g, " ").trim();
  } catch (err: any) {
    console.warn("Transcript fetch failed:", err.message);
  }

  if (!fullTranscript) {
    throw new Error("Could not retrieve transcript for this YouTube video (captions may be disabled).");
  }

  // Truncate transcript to reasonable length (~25,000 words max) to fit token limits
  const truncatedTranscript = fullTranscript.slice(0, 50000);

  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || "").trim();
  const groqKey = (process.env.GROQ_API_KEY || "").trim();

  let structuredData: { title?: string; body?: string; tags?: string[] } | null = null;

  const prompt = `Analyze this YouTube video transcript for "${videoTitle}" by ${channelName}.
Create a high-quality, structured Markdown summary note.
Rules:
1. Provide a clear, descriptive title.
2. Structure the note with key takeaways, main points, and key details.
3. Suggest 2 to 4 relevant tags (lowercase, single word without #).

Return ONLY valid JSON matching this schema:
{
  "title": "Clean Note Title",
  "body": "Formatted body text with headings (## Key Takeaways, ## Summary, etc.)...",
  "tags": ["tag1", "tag2"]
}

Transcript:
${truncatedTranscript}`;

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
  const bodyText = (structuredData?.body || fullTranscript.slice(0, 1000) + "...").trim();
  const tags = Array.isArray(structuredData?.tags) && structuredData.tags.length > 0
    ? structuredData.tags.map((t) => t.replace(/^#/, "").toLowerCase().trim())
    : ["youtube", "summary"];

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `youtube-note-${Date.now()}`;

  const today = new Date().toISOString().split("T")[0];
  const tagList = tags.map((t) => `  - ${t}`).join("\n");

  const headerInfo = channelName ? `> 🎥 **Source Video:** [${videoTitle}](${youtubeUrl}) (${channelName})\n\n` : `> 🎥 **Source Video:** [${videoTitle}](${youtubeUrl})\n\n`;

  const markdownContent = `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndraft: false\nauthor: Ridoy\ndate: ${today}\ntags:\n${tagList}\n---\n\n${headerInfo}${bodyText}\n`;

  return {
    title,
    slug,
    markdownContent,
    tags,
  };
}
