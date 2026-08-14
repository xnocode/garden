import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createPasswordHash } from "@/lib/auth";
import { isAllowedEmailDomain } from "@/lib/email-validator";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!isAllowedEmailDomain(cleanEmail)) {
      return NextResponse.json(
        {
          error:
            "Please use a trusted email provider (Gmail, Outlook, Yahoo, iCloud, Proton). Educational (.edu) and disposable emails are not supported.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await db.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    const role = adminEmail && cleanEmail === adminEmail ? "admin" : "member";
    const passwordHash = createPasswordHash(password);

    const user = await db.user.create({
      data: {
        email: cleanEmail,
        name: (name || cleanEmail.split("@")[0]).trim(),
        passwordHash,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully.",
        user,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to create account." },
      { status: 500 }
    );
  }
}
