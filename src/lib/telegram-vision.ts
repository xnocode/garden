/**
 * telegram-vision.ts — Image/Photo OCR & Whiteboard to Structured Markdown Note.
 */

interface VisionNoteResult {
  title: string;
  slug: string;
  markdownContent: string;
  tags: string[];
}

export async function processImageToNote(
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg"
): Promise<VisionNoteResult> {
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || "").trim();

  if (!geminiKey) {
    throw new Error("Gemini API key is required for image OCR/Vision processing.");
  }

  const base64Image = imageBuffer.toString("base64");

  const prompt = `Analyze this image (whiteboard, handwritten note, screenshot, document, or slide).
Extract all text, diagrams, and key concepts into a clean, well-structured Markdown note.
Rules:
1. Generate an informative title based on the image content.
2. Transcribe any handwritten or printed text accurately.
3. Structure with proper Markdown headers, lists, and code blocks (if code is present).
4. Suggest 1 to 4 relevant tags (lowercase, single word without #).

Return ONLY valid JSON matching this schema:
{
  "title": "Clear Note Title",
  "body": "Formatted body text...",
  "tags": ["tag1", "tag2"]
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || "image/jpeg",
                  data: base64Image,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini Vision error (HTTP ${res.status}): ${errText}`);
  }

  const data = await res.json();
  const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawJson) {
    throw new Error("No response received from Gemini Vision model.");
  }

  const structuredData = JSON.parse(rawJson);

  const title = (structuredData?.title || "OCR Note").trim();
  const bodyText = (structuredData?.body || "Extracted content from image.").trim();
  const tags = Array.isArray(structuredData?.tags) && structuredData.tags.length > 0
    ? structuredData.tags.map((t: string) => t.replace(/^#/, "").toLowerCase().trim())
    : ["ocr", "image-note"];

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `image-note-${Date.now()}`;

  const today = new Date().toISOString().split("T")[0];
  const tagList = tags.map((t: string) => `  - ${t}`).join("\n");

  const markdownContent = `---\ntitle: "${title.replace(/"/g, '\\"')}"\ndraft: false\nauthor: Ridoy\ndate: ${today}\ntags:\n${tagList}\n---\n\n${bodyText}\n`;

  return {
    title,
    slug,
    markdownContent,
    tags,
  };
}
