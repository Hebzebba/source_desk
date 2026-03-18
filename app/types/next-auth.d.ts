import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: "customer" | "employee" | "admin";
    } & DefaultSession["user"];
  }
  interface User {
    id: string;
    role?: "customer" | "employee" | "admin";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "customer" | "employee" | "admin";
  }
}
