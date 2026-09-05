import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isTaskwarriorPublic } from "@/lib/settings";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.role === "admin";
    const isPublic = await isTaskwarriorPublic();

    const tasksFilePath = resolve(process.cwd(), "src/data/tasks.json");
    let taskData = {
      exportedAt: new Date().toISOString(),
      stats: { total: 0, pending: 0, completed: 0 },
      tasks: [] as any[],
      completedTasks: [] as any[],
    };

    try {
      const raw = await fs.readFile(tasksFilePath, "utf8");
      taskData = JSON.parse(raw);
    } catch {
      // Use fallback defaults
    }

    // If public or authorized admin, return complete data
    if (isPublic || isAdmin) {
      return NextResponse.json({
        ...taskData,
        isPublic,
        isAdmin,
        isBlurred: false,
      });
    }

    // Mask task descriptions with frosted glass placeholder for public viewers when private
    const sampleMasks = [
      "Task Entry •••••••••••••••••",
      "Confidential Item ••••••••••••••••••••••",
      "Private Focus ••••••••••••••",
      "Workflow Objective ••••••••••••••••••••••••",
      "Study Module •••••••••••••••••••",
    ];

    const maskedPendingTasks = (taskData.tasks || []).map((t, idx) => ({
      ...t,
      description: sampleMasks[idx % sampleMasks.length],
    }));

    const maskedCompletedTasks = (taskData.completedTasks || []).map((t, idx) => ({
      ...t,
      description: sampleMasks[(idx + 2) % sampleMasks.length],
    }));

    return NextResponse.json({
      exportedAt: taskData.exportedAt,
      stats: taskData.stats,
      tasks: maskedPendingTasks,
      completedTasks: maskedCompletedTasks,
      isPublic: false,
      isAdmin: false,
      isBlurred: true,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load tasks" },
      { status: 500 }
    );
  }
}
