import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const requests = await prisma.request.findMany({
      select: {
        id: true,
        customerId: true,
        name: true,
        quantity: true,
        description: true,
        img_url: true,
        quotePrice: true,
        finalPrice: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(requests);
  } catch (error) {
    console.error("Request fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch customer requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, name, quantity, description, img_url, quotePrice, finalPrice, status } = body;
    // Validation
    if (!name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const request = await prisma.request.create({
      data: {
        customerId,
        name,
        quantity: quantity || 1,
        description: description || "",
        img_url: img_url || "",
        quotePrice: quotePrice || 0.0,
        finalPrice: finalPrice || 0.0,
        status: status || "PENDING",
      },
    });
    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    console.error("Request creation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create user",
      },
      { status: 500 },
    );
  }
}
