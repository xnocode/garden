import { exec } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";
import path from "path";

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const { cmd, title, description } = await req.json();

    let commandStr = cmd;
    if (!commandStr && (title || description)) {
      const taskText = title || description;
      const safeDesc = taskText.replace(/"/g, '\\"');
      commandStr = `task add project:study priority:H +ai-quest "${safeDesc}"`;
    }

    if (!commandStr) {
      return NextResponse.json({ error: "No task content provided" }, { status: 400 });
    }

    // Optional Admin Key Check:
    // If ADMIN_SECRET is set in environment, require x-admin-key header to match.
    // If ADMIN_SECRET is not set, allow task addition directly from deployed site!
    const adminSecret = (process.env.ADMIN_SECRET || "").trim();
    const requestKey = (req.headers.get("x-admin-key") || "").trim();

    if (adminSecret && requestKey !== adminSecret) {
      return NextResponse.json({
        success: true,
        isPublicVisitor: true,
        command: commandStr,
        message: "Pass ADMIN_SECRET key or set header to add directly.",
      });
    }

    // Execute task add directly in Taskwarrior CLI on server host
    const { stdout } = await execAsync(commandStr);

    // Export updated tasks.json snapshot
    try {
      const tasksJsonPath = path.join(process.cwd(), "src", "data", "tasks.json");
      await execAsync(`task export > "${tasksJsonPath}"`);
    } catch {
      /* ignore snapshot export error */
    }

    return NextResponse.json({
      success: true,
      isPublicVisitor: false,
      message: stdout || "Task added to Taskwarrior CLI",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to execute Taskwarrior command on server." },
      { status: 500 }
    );
  }
}
