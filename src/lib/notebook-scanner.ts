import { SnapshotTask } from "./telegram-file-handler";

export interface ParsedNotebookTask {
  description: string;
  project?: string;
  due?: string; // YYYY-MM-DD
  priority?: "H" | "M" | "L";
  isCompleted?: boolean;
  formattedTaskLine: string;
}

export interface ScanCompletedResult {
  completedHandwrittenTasks: string[];
  matchedTasks: { uuid: string; description: string }[];
  matchedUuids: string[];
  unmatchedTasks: string[];
}

function getTodayStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Scan a handwritten notebook page photo to extract new tasks for Taskwarrior.
 */
export async function scanNotebookForNewTasks(
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg"
): Promise<{ success: boolean; tasks: ParsedNotebookTask[]; taskLines: string[]; rawAiOutput?: string; error?: string }> {
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || "").trim();
  if (!geminiKey) {
    return { success: false, tasks: [], taskLines: [], error: "No GEMINI_API_KEY configured" };
  }

  const todayStr = getTodayStr();
  const base64Image = imageBuffer.toString("base64");

  const prompt = `You are an expert handwriting OCR and task extraction AI for Taskwarrior.
Analyze this photo of a physical paper notebook page containing handwritten tasks.
The page may be formatted as a handwritten TABLE / GRID (with columns like Box/Status, Task Description, Project, Due Date, Priority), or as a bulleted/numbered list.
Today's local date is ${todayStr}.

MULTILINGUAL SUPPORT:
- You fully understand handwriting in any language (Bengali বাংলা, English, Banglish, etc.).
- Keep the task description in its natural handwritten language or script (e.g., Bengali বাংলা or English).
- Accurately understand relative date words in any language (e.g. English: "today", "tomorrow", "Friday"; Bengali: "আজ", "কাল", "পরশু", "আজকে", "আগামীকাল", "শুক্রবার") and calculate the exact YYYY-MM-DD based on today (${todayStr}).

Extract all pending / uncompleted tasks written on this page (or all written rows if checkboxes are empty or not crossed out).

For each row / task:
1. "description": Clean, concise task title/description without checkbox symbols. Read from the Task / Description column or line.
2. "project": If a project name, subject header, column (e.g. "Project" column), or tag is written (e.g., "Math", "Dev", "Garden", "Study", "#work", "project:xyz"), extract it as a clean single-word lowercase project identifier (e.g., "math", "dev", "study"). If empty column or none, leave empty string or null.
3. "due": If a due date or relative day is written (e.g. in "Due Date" column: "today", "tomorrow", "Friday", "আজ", "কাল", "Aug 25", "25/08", "in 2 days", "due:2026-08-25"), calculate the exact date in YYYY-MM-DD format based on today (${todayStr}). If empty column or none, leave empty string or null.
4. "priority": If priority is indicated in the "Priority" column or line ("H", "M", "L", "high", "urgent", "জরুরি", "গুরুত্বপূর্ণ", "!", "!!", "priority:H", "P1", "P2"), extract "H", "M", or "L". If empty column or none, default to "M" or null.
5. "isCompleted": true if the checkbox/status column has a checkmark (✓), cross [x], ticked mark, filled square, or if the whole row has a strikethrough line. false if empty [ ] or unchecked.

Output JSON format strictly matching this schema:
{
  "tasks": [
    {
      "description": "Task title here",
      "project": "study",
      "due": "2026-08-22",
      "priority": "H",
      "isCompleted": false
    }
  ]
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`,
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
            temperature: 0.1,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, tasks: [], taskLines: [], error: `Gemini API error (${res.status}): ${errText}` };
    }

    const data = await res.json();
    const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) {
      return { success: false, tasks: [], taskLines: [], error: "No response text received from Gemini Vision" };
    }

    const parsed = JSON.parse(rawJson);
    const rawList: any[] = Array.isArray(parsed) ? parsed : (parsed.tasks || []);

    const tasks: ParsedNotebookTask[] = [];
    const taskLines: string[] = [];

    for (const item of rawList) {
      if (!item.description || typeof item.description !== "string") continue;
      const desc = item.description.trim();
      if (!desc) continue;

      // Filter out tasks already crossed out if user is adding new tasks, unless all items are unchecked
      if (item.isCompleted) {
        continue;
      }

      let line = desc;
      if (item.project && typeof item.project === "string") {
        const cleanProj = item.project.replace(/[^a-zA-Z0-9_\-]/g, "").toLowerCase();
        if (cleanProj) line += ` project:${cleanProj}`;
      }
      if (item.due && typeof item.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.due)) {
        line += ` due:${item.due}`;
      }
      if (item.priority && ["H", "M", "L"].includes(item.priority.toUpperCase())) {
        line += ` priority:${item.priority.toUpperCase()}`;
      }

      tasks.push({
        description: desc,
        project: item.project || undefined,
        due: item.due || undefined,
        priority: item.priority || undefined,
        isCompleted: Boolean(item.isCompleted),
        formattedTaskLine: line,
      });
      taskLines.push(line);
    }

    return { success: true, tasks, taskLines, rawAiOutput: rawJson };
  } catch (err: any) {
    return { success: false, tasks: [], taskLines: [], error: err.message || "Failed to scan notebook page" };
  }
}

/**
 * Scan a handwritten notebook page photo to detect completed / checked-off tasks,
 * and match them against the user's active Taskwarrior tasks.
 */
export async function scanNotebookForCompletedTasks(
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg",
  activeTasks: SnapshotTask[] = []
): Promise<{ success: boolean; result: ScanCompletedResult; error?: string }> {
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || "").trim();
  if (!geminiKey) {
    return {
      success: false,
      result: { completedHandwrittenTasks: [], matchedTasks: [], matchedUuids: [], unmatchedTasks: [] },
      error: "No GEMINI_API_KEY configured",
    };
  }

  const base64Image = imageBuffer.toString("base64");

  const simplifiedTasks = activeTasks.map((t, idx) => ({
    index: idx + 1,
    uuid: t.uuid,
    description: t.description,
    project: t.project || undefined,
  }));

  const prompt = `You are an expert handwriting OCR and task verification AI.
Analyze this photo of a physical paper notebook page where tasks have been written with pen.
The page may be formatted as a handwritten TABLE / GRID (with columns like Box/Status, Task, Project, Due Date, Priority) or as a list.

YOUR MISSION:
Identify all tasks on this handwritten page that have been MARKED AS COMPLETED.
Signs of completion:
- A checked box [x], checkmark (✓), or tick mark inside or beside the checkbox or status column.
- A crossed-out line (strikethrough through the text or entire row).
- A shaded/filled/blackened checkbox in the status column.

Below is the user's current list of ACTIVE Taskwarrior tasks in their digital system:
${JSON.stringify(simplifiedTasks, null, 2)}

Match each completed handwritten item on the paper with the corresponding active task from the list above (using fuzzy semantic understanding of descriptions across any language, e.g. Bengali বাংলা, English, or Banglish).

Output JSON strictly matching this schema:
{
  "completedHandwrittenTasks": [
    "Text of completed task written on paper 1",
    "Text of completed task written on paper 2"
  ],
  "matchedUuids": [
    "uuid-of-matching-active-task-1"
  ],
  "matchedTasks": [
    {
      "uuid": "uuid-of-matching-active-task-1",
      "description": "Digital task description from active list"
    }
  ],
  "unmatchedTasks": [
    "Handwritten completed task description if not found in active digital task list"
  ]
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`,
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
            temperature: 0.1,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        result: { completedHandwrittenTasks: [], matchedTasks: [], matchedUuids: [], unmatchedTasks: [] },
        error: `Gemini API error (${res.status}): ${errText}`,
      };
    }

    const data = await res.json();
    const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) {
      return {
        success: false,
        result: { completedHandwrittenTasks: [], matchedTasks: [], matchedUuids: [], unmatchedTasks: [] },
        error: "No response from Gemini Vision",
      };
    }

    const parsed: ScanCompletedResult = JSON.parse(rawJson);

    // Validate matched UUIDs against actual active tasks to prevent hallucinations
    const validUuids = new Set(activeTasks.map((t) => t.uuid));
    const cleanMatchedUuids = (parsed.matchedUuids || []).filter((u) => validUuids.has(u));
    const cleanMatchedTasks = (parsed.matchedTasks || []).filter((t) => validUuids.has(t.uuid));

    return {
      success: true,
      result: {
        completedHandwrittenTasks: parsed.completedHandwrittenTasks || [],
        matchedTasks: cleanMatchedTasks,
        matchedUuids: cleanMatchedUuids,
        unmatchedTasks: parsed.unmatchedTasks || [],
      },
    };
  } catch (err: any) {
    return {
      success: false,
      result: { completedHandwrittenTasks: [], matchedTasks: [], matchedUuids: [], unmatchedTasks: [] },
      error: err.message || "Failed to scan completed tasks",
    };
  }
}
