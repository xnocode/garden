/**
 * telegram-dump.ts — Unstructured Raw Brain Dump to Structured AI Markdown Note.
 */

interface DumpResult {
  title: string;
  slug: string;
  markdownContent: string;
  tags: string[];
}

export async function processBrainDumpToNote(rawText: string): Promise<DumpResult> {
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || "").trim();
  const groqKey = (process.env.GROQ_API_KEY || "").trim();

  let structuredData: { title?: string; body?: string; tags?: string[] } | null = null;

  const prompt = `Organize this raw brain dump / messy text into a clean, beautiful Markdown note.
Rules:
1. Fix grammar, typos, and improve clarity while preserving the original meaning.
2. Generate an engaging, descriptive title.
3. Use appropriate Markdown headers, bullet points, and bold text.
4. Suggest 1 to 4 relevant tags (lowercase, single word without #).

Return ONLY valid JSON matching this schema:
{
  "title": "Clean Note Title",
  "body": "Formatted body text...",
  "tags": ["tag1", "tag2"]
}

Raw Text:
${rawText}`;

  // 1. Try Gemini 2.0 Flash
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
      console.warn("Gemini brain dump failed:", err.message);
    }
  }

  // 2. Fallback Groq Llama 3.3 70B
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
            { role: "system", content: "Clean up raw notes into structured Markdown. Return JSON: {\"title\": \"Title\", \"body\": \"Markdown\", \"tags\": [\"tag1\"]}" },
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
      console.warn("Groq Llama dump failed:", err.message);
    }
  }

  const title = (structuredData?.title || rawText.split("\n")[0] || "Brain Dump").trim();
  const bodyText = (structuredData?.body || rawText).trim();
  const tags = Array.isArray(structuredData?.tags) && structuredData.tags.length > 0
    ? structuredData.tags.map((t) => t.replace(/^#/, "").toLowerCase().trim())
    : ["brain-dump", "idea"];

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `brain-dump-${Date.now()}`;

  const today = new Date().toISOString().split("T")[0];
  const tagList = tags.map((t) => `  - ${t}`).join("\n");

  const markdownContent = `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndraft: false\nauthor: Ridoy\ndate: ${today}\ntags:\n${tagList}\n---\n\n${bodyText}\n`;

  return {
    title,
    slug,
    markdownContent,
    tags,
  };
}
