/**
 * telegram-clipper.ts — Web Article Link to AI Structured Markdown Note.
 */

interface ClipperResult {
  title: string;
  slug: string;
  markdownContent: string;
  tags: string[];
}

export async function processWebClipToNote(rawUrl: string): Promise<ClipperResult> {
  const parsedUrl = new URL(rawUrl);
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Invalid web URL protocol.");
  }
  const url = parsedUrl.toString();

  // 1. Fetch web page HTML
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) {
    throw new Error(`Could not fetch web page (HTTP ${res.status}).`);
  }

  const html = await res.text();

  // Extract page title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const rawTitle = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "Saved Article";

  // Clean HTML blocks safely
  let textContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ");

  // Iteratively strip HTML tags until none remain
  let prevText = "";
  while (textContent !== prevText) {
    prevText = textContent;
    textContent = textContent.replace(/<[^>]+>/g, " ");
  }

  const cleanText = textContent
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

  if (cleanText.length < 50) {
    throw new Error("Web page contained insufficient text content.");
  }

  const truncatedText = cleanText.slice(0, 40000);

  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || "").trim();
  const groqKey = (process.env.GROQ_API_KEY || "").trim();

  let structuredData: { title?: string; body?: string; tags?: string[] } | null = null;

  const prompt = `Synthesize this web article into a clean, structured Markdown note.
Original Page Title: "${rawTitle}"
Original URL: ${url}

Rules:
1. Provide a clear, informative title for the note.
2. Organize into ## Executive Summary, ## Key Points, ## Key Quotes / Takeaways.
3. Suggest 2 to 4 relevant tags (lowercase, single word without #).

Return ONLY valid JSON:
{
  "title": "Clean Note Title",
  "body": "Formatted body text with Markdown headers...",
  "tags": ["tag1", "tag2"]
}

Article Text:
${truncatedText}`;

  // Process with Gemini 2.0 Flash
  if (geminiKey) {
    try {
      const gRes = await fetch(
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

      if (gRes.ok) {
        const data = await gRes.json();
        const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          structuredData = JSON.parse(rawJson);
        }
      }
    } catch (err: any) {
      console.warn("Gemini clipper failed:", err.message);
    }
  }

  // Fallback: Groq Llama 3.3 70B
  if (!structuredData && groqKey) {
    try {
      const lRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
              content: `You are an expert article summarizer. Return ONLY JSON matching {"title": "Title", "body": "Markdown body", "tags": ["tag1"]}`,
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (lRes.ok) {
        const lData = await lRes.json();
        const content = lData?.choices?.[0]?.message?.content;
        if (content) {
          structuredData = JSON.parse(content);
        }
      }
    } catch (err: any) {
      console.warn("Groq Llama clipper failed:", err.message);
    }
  }

  const title = (structuredData?.title || rawTitle).trim();
  const bodyText = (structuredData?.body || cleanText.slice(0, 1000) + "...").trim();
  const tags = Array.isArray(structuredData?.tags) && structuredData.tags.length > 0
    ? structuredData.tags.map((t) => t.replace(/^#/, "").toLowerCase().trim())
    : ["bookmark", "article"];

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `clipped-article-${Date.now()}`;

  const today = new Date().toISOString().split("T")[0];
  const tagList = tags.map((t) => `  - ${t}`).join("\n");
  const sourceHeader = `> 🔖 **Clipped Article:** [${rawTitle}](${url})\n\n`;

  const markdownContent = `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndraft: false\nauthor: Ridoy\ndate: ${today}\ntags:\n${tagList}\n---\n\n${sourceHeader}${bodyText}\n`;

  return {
    title,
    slug,
    markdownContent,
    tags,
  };
}
