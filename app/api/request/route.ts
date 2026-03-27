import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { REQUEST_SELECT } from "@/lib/requestSelect";
import { notifyUpdate } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const where = session.user.role === "customer" ? { customerId: session.user.id } : {};
    const requests = await prisma.request.findMany({ where, select: REQUEST_SELECT });
    return NextResponse.json(requests);
  } catch {
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "customer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, quantity, description, img_url } = body;

    if (!name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const request = await prisma.request.create({
      data: {
        customerId: session.user.id,
        name,
        quantity: quantity || 1,
        description: description || "",
        img_url: img_url || "",
      },
    });
    await notifyUpdate();
    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create request" },
      { status: 500 },
    );
  }
}
