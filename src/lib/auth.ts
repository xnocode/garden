import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import crypto from "node:crypto";
import { isAllowedEmailDomain } from "@/lib/email-validator";

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

export function verifyPassword(password: string, storedHashWithSalt: string): boolean {
  const parts = storedHashWithSalt.split(":");
  if (parts.length !== 2) return false;
  const [salt, originalHash] = parts;
  const hash = hashPassword(password, salt);
  return hash === originalHash;
}

export function createPasswordHash(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  return `${salt}:${hash}`;
}

export const authOptions: NextAuthOptions = {
  // No fallback: signing sessions with a committed string would let anyone
  // forge admin cookies. Crash instead of silently weakening auth.
  secret: (() => {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      throw new Error(
        "NEXTAUTH_SECRET is not set. Add a random 64-char hex value (openssl rand -hex 32) to the environment."
      );
    }
    return secret;
  })(),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@gmail.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        const email = credentials.email.toLowerCase().trim();
        const adminEmails = (process.env.ADMIN_EMAIL || "")
          .toLowerCase()
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);
        const adminPassword = process.env.ADMIN_PASSWORD || "";

        // ── ADMIN SECRET CREDENTIALS LOGIN ─────────────────────────────────
        // Allows direct login using admin email + admin secret password
        if (adminEmails.includes(email)) {
          if (adminPassword && credentials.password === adminPassword) {
            return {
              id: "admin",
              email,
              name: "Garden Author",
              image: null,
              role: "admin",
            };
          }
        }

        // ── REGULAR / REGISTERED USER LOGIN ───────────────────────────────
        if (!isAllowedEmailDomain(email)) {
          throw new Error(
            "Only trusted email providers (Gmail, Outlook, Yahoo, iCloud, Proton) are supported. .edu and disposable emails are blocked."
          );
        }

        try {
          const user = await db.user.findUnique({ where: { email } });

          if (!user || !user.passwordHash) {
            throw new Error("No account found with this email. Please sign up first.");
          }

          const isValid = verifyPassword(credentials.password, user.passwordHash);
          if (!isValid) {
            throw new Error("Incorrect password.");
          }

          // Email/password accounts must verify their email before signing in.
          if (!user.emailVerified) {
            throw new Error(
              "UNVERIFIED_EMAIL: Please verify your email before signing in. Check your inbox for the 6-digit code."
            );
          }

          const isAdmin = user.role === "admin" || adminEmails.includes(email);

          return {
            id: user.id,
            name: user.name || email.split("@")[0],
            email: user.email,
            image: user.image,
            role: isAdmin ? "admin" : (user.role || "member"),
          };
        } catch (err: any) {
          throw new Error(err.message || "Failed to authenticate.");
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "member";
      }

      if (token.email) {
        const adminEmails = (process.env.ADMIN_EMAIL || "")
          .toLowerCase()
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);
        if (adminEmails.includes(token.email.toLowerCase())) {
          token.role = "admin";
        }
      }

      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = (token.role as string) || "member";
      }
      return session;
    },
  },

  pages: {
    signIn: "/", // custom modal in-place
  },
};
