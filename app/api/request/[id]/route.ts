import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/*
PUT /api/route/:id
*/
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const { discription, img_url, quotePrice, finalPrice, status } = body;

    // Check if request exists
    const existingRequest = await prisma.request.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    if (discription) updateData.discription = discription;
    if (img_url) updateData.img_url = img_url;
    if (quotePrice) updateData.quotePrice = quotePrice;
    if (finalPrice) updateData.finalPrice = finalPrice;
    if (status) updateData.status = status;

    const request = await prisma.request.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(request);
  } catch (error) {
    console.error("Request update error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update request",
      },
      { status: 500 },
    );
  }
}

/*
DELETE /api/route/:id
*/
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    // Check if request exists
    const existingRequest = await prisma.request.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    await prisma.request.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Request deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Request delete error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete request",
      },
      { status: 500 },
    );
  }
}
