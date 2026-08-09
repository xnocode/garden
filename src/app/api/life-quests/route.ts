import { NextResponse } from "next/server";
import { listNotes } from "@/lib/notes";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isRefresh = searchParams.get("refresh") === "true";

    // 1. Fetch existing tasks from tasks.json for deduplication
    let existingTaskTexts: string[] = [];
    try {
      const tasksJsonPath = path.join(process.cwd(), "src", "data", "tasks.json");
      const raw = await fs.readFile(tasksJsonPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        existingTaskTexts = parsed.tasks.map((t: any) => (t.description || "").toLowerCase());
      }
    } catch {
      /* ignore read error */
    }

    // 2. Fetch published notes
    const allNotes = await listNotes({ sort: "updated" });
    const recentNoteTitles = allNotes.slice(0, 15).map((n) => `• "${n.title}"`).join("\n");

    const groqKey = (process.env.WEBSITE_GROQ_KEY || process.env.GROQ_API_KEY || "").trim();
    let aiQuests: Array<any> = [];

    if (groqKey) {
      const seedText = isRefresh ? `Seed Timestamp: ${Date.now()}` : "";
      const prompt = `You are a personal task assistant for a student studying AI & ML, C++ DSA, Python, and University subjects. ${seedText}

User's Recent Notes:
${recentNoteTitles}

Existing Taskwarrior Tasks (DO NOT DUPLICATE THESE):
${existingTaskTexts.map((t) => `- ${t}`).join("\n")}

Generate 6 short, natural, bite-sized study tasks (like real personal tasks).
RULES FOR TASK TITLES:
- Keep titles SHORT, SIMPLE, and DIRECT (e.g., "Study Python loops & break", "Review C++ Binary Trees", "Read Laplace transform notes", "Practice Numerical Methods equations", "Study Data Communication OSI layer").
- Do NOT use heavy course codes like "(CSE0612223)" in the title.
- Make them sound like natural personal tasks you write in a to-do list.

Format as JSON array:
[
  {
    "title": "Short natural task title",
    "description": "1 short sentence of what concept to complete",
    "category": "roadmap",
    "xpReward": 150,
    "taskwarriorCmd": "task add project:study priority:H \\"Short natural task title\\""
  }
]

Do NOT suggest any task that is already in Existing Taskwarrior Tasks above!
Return ONLY raw JSON array.`;

      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: isRefresh ? 0.85 : 0.5,
            max_tokens: 1000,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content || "";
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            aiQuests = JSON.parse(jsonMatch[0]);
          }
        }
      } catch {
        /* Fallback */
      }
    }

    // Natural, short micro-learning task fallbacks
    if (!aiQuests || aiQuests.length === 0) {
      aiQuests = [
        {
          title: "Study Python loops & break statement",
          description: "Learn while loop syntax, break, and continue conditions.",
          category: "roadmap",
          xpReward: 150,
          taskwarriorCmd: 'task add project:python priority:H "Study Python loops & break statement"',
        },
        {
          title: "Review C++ Binary Search Trees",
          description: "Practice BST insertion, deletion, and tree traversal algorithms.",
          category: "roadmap",
          xpReward: 200,
          taskwarriorCmd: 'task add project:dsa priority:H "Review C++ Binary Search Trees"',
        },
        {
          title: "Read AI & ML linear algebra prerequisites",
          description: "Review matrix multiplication and vector spaces for ML models.",
          category: "roadmap",
          xpReward: 180,
          taskwarriorCmd: 'task add project:aiml priority:H "Read AI & ML linear algebra prerequisites"',
        },
        {
          title: "Study Data Communication OSI model layers",
          description: "Review data link layer framing and error detection protocols.",
          category: "roadmap",
          xpReward: 150,
          taskwarriorCmd: 'task add project:study priority:M "Study Data Communication OSI model layers"',
        },
        {
          title: "Solve Numerical Methods Newton-Raphson equations",
          description: "Practice solving non-linear root equations step by step.",
          category: "roadmap",
          xpReward: 160,
          taskwarriorCmd: 'task add project:study priority:M "Solve Numerical Methods Newton-Raphson equations"',
        },
        {
          title: "Read Laplace transform & Fourier series notes",
          description: "Derive basic Laplace transforms for differential equations.",
          category: "roadmap",
          xpReward: 170,
          taskwarriorCmd: 'task add project:study priority:M "Read Laplace transform & Fourier series notes"',
        },
      ];
    }

    // Deduplication Filter against existing Taskwarrior tasks
    const filteredQuests = aiQuests.filter((q) => {
      const qLower = (q.title + " " + q.description).toLowerCase();
      return !existingTaskTexts.some((existing) => {
        if (!existing) return false;
        const words = existing.split(/\s+/).filter((w) => w.length > 3);
        const matchCount = words.filter((w) => qLower.includes(w)).length;
        return matchCount >= 3;
      });
    });

    return NextResponse.json({
      quests: filteredQuests.length > 0 ? filteredQuests : aiQuests,
    });
  } catch {
    return NextResponse.json({
      quests: [
        {
          title: "Study Python loops & break statement",
          description: "Learn while loop syntax, break, and continue conditions.",
          category: "roadmap",
          xpReward: 150,
          taskwarriorCmd: 'task add project:python priority:H "Study Python loops & break statement"',
        },
      ],
    });
  }
}
