/**
 * telegram-voice.ts — Voice Note to Markdown via Gemini 2.0 Flash / Groq Whisper.
 */

interface VoiceNoteResult {
  title: string;
  slug: string;
  markdownContent: string;
  tags: string[];
}

export async function processVoiceNoteToMarkdown(
  audioBuffer: Buffer,
  mimeType: string = "audio/ogg"
): Promise<VoiceNoteResult> {
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || "").trim();
  const groqKey = (process.env.GROQ_API_KEY || "").trim();

  let transcriptText = "";
  let structuredData: { title?: string; body?: string; tags?: string[] } | null = null;

  // 1. Try Gemini 2.0 Flash directly (Audio -> Structured JSON)
  if (geminiKey) {
    try {
      const base64Audio = audioBuffer.toString("base64");
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
                      mimeType: mimeType || "audio/ogg",
                      data: base64Audio,
                    },
                  },
                  {
                    text: `Listen to this spoken voice note. Transcribe it into a clean, well-formatted Markdown note.
Rules:
1. Fix verbal stutters and filler words (um, uh, like, you know).
2. Generate a clear, concise title for the note.
3. Write clean, readable Markdown content with appropriate formatting (paragraphs, bullet points if listing things).
4. Suggest 1 to 4 relevant tags (lowercase, single word without #).

Return ONLY valid JSON matching this schema:
{
  "title": "Clear Note Title",
  "body": "Formatted body text of the note...",
  "tags": ["tag1", "tag2"]
}`,
                  },
                ],
              },
            ],
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
      } else {
        console.warn("Gemini voice processing status:", res.status, await res.text());
      }
    } catch (err: any) {
      console.warn("Gemini voice processing failed, attempting fallback:", err.message);
    }
  }

  // 2. Fallback: Groq Whisper (if Gemini failed or key missing)
  if (!structuredData && groqKey) {
    try {
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: mimeType || "audio/ogg" });
      formData.append("file", blob, "voice.ogg");
      formData.append("model", "whisper-large-v3-turbo");
      formData.append("response_format", "json");

      const whisperRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}` },
        body: formData,
      });

      if (whisperRes.ok) {
        const wData = await whisperRes.json();
        transcriptText = wData.text || "";

        // If we got a transcript, use Groq Llama-3.3 to structure it into Title, Body, Tags
        if (transcriptText.trim()) {
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
                    content: `Clean up this voice transcript into a structured Markdown note. Return ONLY a valid JSON object matching: {"title": "Clear Title", "body": "Formatted body text", "tags": ["tag1", "tag2"]}`,
                  },
                  { role: "user", content: transcriptText },
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
          } catch {
            // Keep raw transcriptText if Llama structuring fails
          }
        }
      }
    } catch (err: any) {
      console.warn("Groq Whisper fallback failed:", err.message);
    }
  }

  // Fallback text processing if structuredData is empty
  const title = (structuredData?.title || transcriptText.split("\n")[0] || "Voice Note").trim();
  const bodyText = (structuredData?.body || transcriptText || "Voice note recording").trim();
  const tags = Array.isArray(structuredData?.tags) && structuredData.tags.length > 0
    ? structuredData.tags.map((t) => t.replace(/^#/, "").toLowerCase().trim())
    : ["voice-note"];

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `voice-note-${Date.now()}`;

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
