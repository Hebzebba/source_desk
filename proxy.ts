import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  if (!token) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  const roleDashboard: Record<string, string> = {
    admin: "/ui/admin",
    employee: "/ui/employee",
    customer: "/ui/customer",
  };
  const ownDashboard = roleDashboard[String(token.role ?? "")] ?? "/signin";

  if (pathname.startsWith("/ui/admin") && token.role !== "admin") {
    return NextResponse.redirect(new URL(ownDashboard, req.url));
  }
  if (pathname.startsWith("/ui/employee") && token.role !== "employee") {
    return NextResponse.redirect(new URL(ownDashboard, req.url));
  }
  if (pathname.startsWith("/ui/customer") && token.role !== "customer") {
    return NextResponse.redirect(new URL(ownDashboard, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/ui/:path*"],
};
