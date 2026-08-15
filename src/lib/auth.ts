import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
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
  secret: process.env.NEXTAUTH_SECRET || "digital-garden-secret-token-key-321-safe",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: "select_account",
              },
            },
          }),
        ]
      : []),

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
        const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
        const adminPassword = process.env.ADMIN_PASSWORD || "";

        // ── ADMIN LOGIN ────────────────────────────────────────────────────
        // Admin uses a secret fake email + secret password stored only in env.
        // Google OAuth can NEVER grant admin role — this is the only path.
        if (adminEmail && email === adminEmail) {
          if (!adminPassword || credentials.password !== adminPassword) {
            throw new Error("Invalid admin credentials.");
          }
          // Admin is never stored in DB — pure env-based, unhackable via OAuth
          return {
            id: "admin",
            email: adminEmail,
            name: "Garden Author",
            image: null,
            role: "admin",
          };
        }

        // ── REGULAR MEMBER LOGIN ───────────────────────────────────────────
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

          return {
            id: user.id,
            name: user.name || email.split("@")[0],
            email: user.email,
            image: user.image,
            role: user.role || "member",
          };
        } catch (err: any) {
          throw new Error(err.message || "Failed to authenticate.");
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      // Google OAuth users are ALWAYS regular members — never admin.
      // Admin can only log in via credentials with the secret email + password.
      if (account?.provider === "google") {
        const email = user.email.toLowerCase().trim();
        try {
          const existingUser = await db.user.findUnique({ where: { email } });
          if (!existingUser) {
            await db.user.create({
              data: {
                email,
                name: user.name || email.split("@")[0],
                image: user.image,
                role: "member", // Google OAuth = always member
                emailVerified: new Date(),
              },
            });
          } else {
            // Keep existing role (but never promote to admin via OAuth)
            if (existingUser.role === "admin") {
              await db.user.update({
                where: { email },
                data: { role: "member", image: user.image || existingUser.image },
              });
            }
          }
        } catch {
          // DB sync error — still allow sign in
        }
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        // Trust the role set by the authorize() function — don't re-derive from email
        token.role = (user as any).role || "member";
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
