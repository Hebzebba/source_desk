import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const requests = await prisma.request.findMany({
      select: {
        id: true,
        customerId: true,
        description: true,
        quotePrice: true,
        finalPrice: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(requests);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch customer requests" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, description, img_url, quotePrice, finalPrice, status } =
      body;
    // Validation
    if (!description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const request = await prisma.request.create({
      data: {
        customerId,
        description,
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
