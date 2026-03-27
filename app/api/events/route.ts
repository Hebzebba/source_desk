import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { Client } from "pg";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { REQUEST_SELECT } from "@/lib/requestSelect";

export const dynamic = "force-dynamic";

async function fetchData(role: string, userId: string) {
  if (role === "admin") {
    const [requests, users] = await Promise.all([
      prisma.request.findMany({ select: REQUEST_SELECT }),
      prisma.user.findMany({
        select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true, updatedAt: true },
      }),
    ]);
    return { requests, users };
  }
  if (role === "employee") {
    const requests = await prisma.request.findMany({ select: REQUEST_SELECT });
    return { requests };
  }
  const requests = await prisma.request.findMany({
    where: { customerId: userId },
    select: REQUEST_SELECT,
  });
  return { requests };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { role, id: userId } = session.user;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // connection already closed
        }
      };

      // Send initial payload immediately
      try {
        send(await fetchData(role, userId));
      } catch (e) {
        console.error("SSE initial fetch error:", e);
      }

      // Dedicated pg connection for LISTEN — push only when data changes
      const pgClient = new Client({ connectionString: process.env.DATABASE_URL });
      await pgClient.connect();
      await pgClient.query("LISTEN source_desk_updates");

      pgClient.on("error", (e) => console.error("SSE pg client error:", e));

      pgClient.on("notification", async () => {
        try {
          send(await fetchData(role, userId));
        } catch (e) {
          console.error("SSE notification fetch error:", e);
        }
      });

      // Keep-alive heartbeat every 15 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // closed
        }
      }, 15000);

      req.signal.addEventListener("abort", async () => {
        clearInterval(heartbeat);
        try { await pgClient.query("UNLISTEN source_desk_updates"); await pgClient.end(); } catch { /* ignore */ }
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
