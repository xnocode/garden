/**
 * telegram-pdf.ts
 * PDF → Markdown Note converter using Gemini File API.
 *
 * Approach: Upload the PDF binary to Gemini Files API (free), then ask
 * Gemini 2.0 Flash to extract and structure the content into a Markdown note.
 * This avoids any Node.js canvas/browser-DOM dependencies entirely.
 */

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();

interface PdfNote {
  slug: string;
  title: string;
  tags: string[];
  markdownContent: string;
}

function makeSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || `pdf-note-${Date.now()}`;
}

export async function processPdfToNote(buffer: Buffer, originalFileName: string): Promise<PdfNote> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set.");

  const today = new Date().toISOString().split("T")[0];

  // ── Step 1: Upload PDF to Gemini Files API ────────────────────────────────
  // The Files API accepts raw binary uploads and returns a file URI
  const uploadRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/pdf",
        "X-Goog-Upload-Protocol": "raw",
        "X-Goog-Upload-Header-Content-Length": String(buffer.byteLength),
        "X-Goog-Upload-Header-Content-Type": "application/pdf",
      },
      body: new Uint8Array(buffer),
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Gemini file upload failed (${uploadRes.status}): ${err.slice(0, 200)}`);
  }

  const uploadData = await uploadRes.json();
  const fileUri = uploadData?.file?.uri;
  if (!fileUri) throw new Error("Gemini did not return a file URI after upload.");

  // ── Step 2: Ask Gemini to structure the PDF into a Markdown note ──────────
  const prompt = `You are a study note generator. Analyse the uploaded PDF and convert it into a clean, well-structured Markdown note.

Rules:
- Add a YAML frontmatter block at the top with: title, draft: false, author: Ridoy, date: ${today}, and 2-4 relevant tags as a YAML list
- Use proper Markdown headings (##, ###) to organise sections
- Format code/commands in backtick code blocks
- Keep the content faithful to the source — don't hallucinate
- Make it concise, study-friendly, and clear
- End with a ## Summary section with 3-5 bullet points of key takeaways

Output ONLY the complete Markdown note starting with ---`;

  const genRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { file_data: { mime_type: "application/pdf", file_uri: fileUri } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: { temperature: 0.3, maxOutputTokens: 3000 },
      }),
    }
  );

  const genData = await genRes.json();
  const markdownContent = genData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

  if (!markdownContent) {
    const errDetail = JSON.stringify(genData?.error || genData).slice(0, 200);
    throw new Error(`Gemini failed to generate note from PDF: ${errDetail}`);
  }

  // ── Step 3: Parse title + tags from generated frontmatter ────────────────
  let title = originalFileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim();
  let tags: string[] = ["pdf", "lecture"];

  const titleMatch = markdownContent.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  if (titleMatch) title = titleMatch[1].trim();

  const tagsBlock = markdownContent.match(/tags:\s*\n([\s\S]*?)(?=\n\w|\n---)/m);
  if (tagsBlock) {
    const parsed = tagsBlock[1]
      .split("\n")
      .map((l) => l.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean);
    if (parsed.length) tags = parsed;
  }

  const slug = makeSlug(title);
  return { slug, title, tags, markdownContent };
}
