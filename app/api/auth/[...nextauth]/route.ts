import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";

const normalizeRole = (role?: string) => { 
  const r = String(role ?? "customer").toLowerCase();
  if (["admin", "employee", "customer"].includes(r))
    return r as "admin" | "employee" | "customer";
  return "customer";
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "you@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user || !user.password) return null; // Google-only users have no password
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          //   name: user.name ?? undefined,
          role: normalizeRole(user.role),
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await prisma.user.upsert({
            where: { email: user.email! },
            update: {},
            create: {
              email: user.email!,
              firstName: user.name?.split(" ")[0] ?? "",
              lastName: user.name?.split(" ").slice(1).join(" ") ?? "",
              role: "CUSTOMER",
            },
          });
        } catch (e) {
          console.error("Failed to upsert Google user:", e);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }: { token: JWT; user?: { role?: string }; account?: { provider?: string } | null }) {
      if (user?.role) token.role = normalizeRole(user.role);
      // On Google sign-in, the user object doesn't carry the DB role — fetch it
      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true },
        });
        if (dbUser) {
          token.sub = dbUser.id;
          token.role = normalizeRole(dbUser.role);
        }
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = normalizeRole(token.role as string);
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
