import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import crypto from "node:crypto";

/**
 * List of trusted, major corporate email providers.
 * Blocks disposable/throwaway domains and educational .edu addresses.
 */
export const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "proton.me",
  "protonmail.com",
  "fastmail.com",
  "zoho.com",
];

export function isAllowedEmailDomain(email: string): boolean {
  if (!email || !email.includes("@")) return false;
  const domain = email.toLowerCase().split("@")[1]?.trim();
  if (!domain) return false;

  // Explicitly block .edu domains
  if (domain.endsWith(".edu") || domain.includes(".edu.")) {
    return false;
  }

  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

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
      : [
          // Fallback provider if Google credentials are not yet configured in .env
          GoogleProvider({
            clientId: "placeholder-id",
            clientSecret: "placeholder-secret",
          }),
        ]),
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

        if (!isAllowedEmailDomain(email)) {
          throw new Error(
            "Only trusted email providers (Gmail, Outlook, Yahoo, iCloud, Proton) are supported."
          );
        }

        try {
          const user = await db.user.findUnique({
            where: { email },
          });

          if (!user || !user.passwordHash) {
            throw new Error("No account found with this email or password is not set.");
          }

          const isValid = verifyPassword(credentials.password, user.passwordHash);
          if (!isValid) {
            throw new Error("Invalid password.");
          }

          const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
          const role = adminEmail && email === adminEmail ? "admin" : user.role || "member";

          return {
            id: user.id,
            name: user.name || email.split("@")[0],
            email: user.email,
            image: user.image,
            role,
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

      const email = user.email.toLowerCase().trim();
      const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
      const isAdmin = !!adminEmail && email === adminEmail;
      const role = isAdmin ? "admin" : "member";

      // If logging in via OAuth (Google), sync/upsert user record in DB
      if (account?.provider === "google") {
        try {
          const existingUser = await db.user.findUnique({ where: { email } });
          if (existingUser) {
            // Update role if matches admin
            if (isAdmin && existingUser.role !== "admin") {
              await db.user.update({
                where: { email },
                data: { role: "admin", image: user.image || existingUser.image },
              });
            }
          } else {
            await db.user.create({
              data: {
                email,
                name: user.name || email.split("@")[0],
                image: user.image,
                role,
                emailVerified: new Date(),
              },
            });
          }
        } catch {
          // DB sync error fallback
        }
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        const email = (user.email || "").toLowerCase().trim();
        const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
        token.role = adminEmail && email === adminEmail ? "admin" : (user as any).role || "member";
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
