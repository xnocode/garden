/**
 * telegram-ask.ts — Ask Your Garden Knowledge Base AI Assistant.
 */

import { searchTelegramNotes, getTasksFromGitHub } from "./telegram-file-handler";
import { geminiUrl } from "./ai-models";

export async function askGardenKnowledgeBase(question: string): Promise<string> {
  // 1. Retrieve top matching notes from garden
  const searchResults = await searchTelegramNotes(question);
  const tasksSnapshot = await getTasksFromGitHub();

  let contextBlocks: string[] = [];

  // Add notes context
  if (searchResults.length > 0) {
    contextBlocks.push("--- GARDEN NOTES ---");
    for (const note of searchResults.slice(0, 5)) {
      contextBlocks.push(`Title: ${note.title}\nContent:\n${note.snippet.slice(0, 1500)}`);
    }
  }

  // Add tasks context
  if (tasksSnapshot && tasksSnapshot.tasks.length > 0) {
    contextBlocks.push("--- CURRENT TASKS ---");
    const taskList = tasksSnapshot.tasks
      .map((t, i) => `${i + 1}. ${t.description} (Due: ${t.due || "none"}, Priority: ${t.priority || "none"})`)
      .join("\n");
    contextBlocks.push(taskList);
  }

  const contextText = contextBlocks.join("\n\n");

  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || "").trim();
  const groqKey = (process.env.GROQ_API_KEY || "").trim();

  const systemPrompt = `You are the personal AI assistant for Ridoy's Digital Garden ("xnocode").
Answer the user's question accurately using the provided notes and tasks from their digital garden context.
Rules:
- Be concise, clear, and helpful.
- Reference specific note titles when quoting information.
- Use Telegram HTML formatting (<b>bold</b>, <code>code</code>, <i>italic</i>).
- If the answer isn't in the context, give your best helpful response while stating that it wasn't directly found in the garden notes.`;

  const userPrompt = `Context from Garden:\n${contextText || "No matching notes found."}\n\nQuestion: ${question}`;

  // Gemini 2.0 Flash
  if (geminiKey) {
    try {
      const res = await fetch(
        geminiUrl(geminiKey),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${systemPrompt}\n\n${userPrompt}` }
                ]
              }
            ]
          })
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      }
    } catch (err: any) {
      console.warn("Gemini ask failed:", err.message);
    }
  }

  // Groq Llama Fallback
  if (groqKey) {
    try {
      const lRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      });

      if (lRes.ok) {
        const lData = await lRes.json();
        const content = lData?.choices?.[0]?.message?.content;
        if (content) return content.trim();
      }
    } catch (err: any) {
      console.warn("Groq Llama ask failed:", err.message);
    }
  }

  return "Sorry, I couldn't query your garden knowledge base right now. Please check your API keys.";
}
