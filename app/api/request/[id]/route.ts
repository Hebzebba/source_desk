import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";
import { minio } from "@/lib/minio";

const BUCKET = process.env.MINIO_BUCKET || "source-desk";

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
    const { name, quantity, description, img_url, quotePrice, finalPrice, status, quotedById } = body;

    // Check if request exists
    const existingRequest = await prisma.request.findUnique({
      where: { id },
      select: { id: true, img_url: true, status: true },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Validate status transitions
    if (status !== undefined && status !== existingRequest.status) {
      const validTransitions: Record<string, string[]> = {
        PENDING: ["QUOTED"],
        QUOTED: ["PENDING", "APPROVED"],
        APPROVED: ["PURCHASED"],
        PURCHASED: ["AT_WAREHOUSE"],
        AT_WAREHOUSE: ["SHIPPED"],
        SHIPPED: ["DONE"],
      };
      const allowed = validTransitions[existingRequest.status] || [];
      if (!allowed.includes(status)) {
        return NextResponse.json({ error: `Cannot change status from ${existingRequest.status} to ${status}` }, { status: 400 });
      }
    }

    // If images are being replaced, delete old ones from MinIO
    if (img_url !== undefined && existingRequest.img_url) {
      let oldUrls: string[] = [];
      try {
        const parsed = JSON.parse(existingRequest.img_url);
        if (Array.isArray(parsed)) oldUrls = parsed;
      } catch {
        if (existingRequest.img_url.startsWith("/api/image/")) oldUrls = [existingRequest.img_url];
      }

      await Promise.all(
        oldUrls.map((url) => {
          const match = url.match(/\/api\/image\/(.+)$/);
          if (!match) return Promise.resolve();
          return minio
            .send(new DeleteObjectCommand({ Bucket: BUCKET, Key: match[1] }))
            .catch((err) => console.error("Failed to delete old image:", err));
        }),
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (description !== undefined) updateData.description = description;
    if (img_url !== undefined) updateData.img_url = img_url;
    if (quotePrice !== undefined) updateData.quotePrice = quotePrice;
    if (finalPrice !== undefined) updateData.finalPrice = finalPrice;
    if (status !== undefined) updateData.status = status;
    if (quotedById !== undefined) updateData.quotedById = quotedById;

    // Auto-set status to QUOTED when final price is set on a PENDING request
    if (finalPrice !== undefined && finalPrice > 0 && existingRequest.status === "PENDING") {
      updateData.status = "QUOTED";
    }

    const request = await prisma.request.update({
      where: { id },
      data: updateData,
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
        user: { select: { firstName: true, lastName: true } },
        quotedBy: { select: { firstName: true, lastName: true } },
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
      select: { id: true, img_url: true },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Delete images from MinIO
    if (existingRequest.img_url) {
      let urls: string[] = [];
      try {
        const parsed = JSON.parse(existingRequest.img_url);
        if (Array.isArray(parsed)) urls = parsed;
      } catch {
        if (existingRequest.img_url.startsWith("/api/image/") || existingRequest.img_url.startsWith("http")) {
          urls = [existingRequest.img_url];
        }
      }

      await Promise.all(
        urls.map((url) => {
          // Extract key from proxy URL /api/image/requests/uuid.ext
          const match = url.match(/\/api\/image\/(.+)$/);
          if (!match) return Promise.resolve();
          return minio.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: match[1] })).catch((err) => console.error("Failed to delete image:", err));
        }),
      );
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
