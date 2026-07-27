import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

export const dynamic = "force-dynamic";

const asyncExec = promisify(exec);

export interface TaskwarriorTask {
  id: number;
  uuid: string;
  description: string;
  status: "pending" | "completed" | "deleted" | "recurring" | "waiting";
  project?: string;
  tags?: string[];
  priority?: "H" | "M" | "L";
  due?: string;
  entry?: string;
  end?: string;
  modified?: string;
  urgency?: number;
  scheduled?: string;
  wait?: string;
  depends?: string[];
  annotations?: { entry: string; description: string }[];
  [key: string]: unknown;
}

export async function GET() {
  try {
    // Use wsl to run taskwarrior export which gives JSON output
    const { stdout, stderr } = await asyncExec(
      'wsl task rc.json.array=on status:pending export 2>/dev/null',
      { timeout: 10000 }
    );

    // Filter out shell warnings (like .zshenv errors)
    const jsonLine = stdout.trim();
    if (!jsonLine) {
      return NextResponse.json({ tasks: [], stats: { pending: 0, completed: 0, projects: 0, tags: 0 } });
    }

    let tasks: TaskwarriorTask[];
    try {
      tasks = JSON.parse(jsonLine);
    } catch {
      // Try to find JSON array in the output (skip shell warnings)
      const match = jsonLine.match(/\[[\s\S]*\]/);
      if (match) {
        tasks = JSON.parse(match[0]);
      } else {
        return NextResponse.json({ tasks: [], stats: { pending: 0, completed: 0, projects: 0, tags: 0 } });
      }
    }

    // Also get completed tasks count
    let completedCount = 0;
    try {
      const { stdout: completedOut } = await asyncExec(
        'wsl task rc.json.array=on status:completed export 2>/dev/null',
        { timeout: 10000 }
      );
      const completedJson = completedOut.trim();
      if (completedJson) {
        const completedMatch = completedJson.match(/\[[\s\S]*\]/);
        if (completedMatch) {
          const completedTasks = JSON.parse(completedMatch[0]);
          completedCount = completedTasks.length;
        }
      }
    } catch {
      // Ignore errors fetching completed tasks
    }

    // Compute stats
    const projects = new Set(tasks.map((t) => t.project).filter(Boolean));
    const allTags = new Set(tasks.flatMap((t) => t.tags || []));

    return NextResponse.json({
      tasks,
      stats: {
        pending: tasks.length,
        completed: completedCount,
        projects: projects.size,
        tags: allTags.size,
      },
    });
  } catch (error) {
    console.error("Taskwarrior API error:", error);
    return NextResponse.json(
      {
        error: `Failed to fetch tasks: ${(error as Error).message}`,
        tasks: [],
        stats: { pending: 0, completed: 0, projects: 0, tags: 0 },
      },
      { status: 500 }
    );
  }
}
