import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";
import { minio } from "@/lib/minio";
import { notifyUpdate } from "@/lib/notify";
import { z } from "zod";

const VALID_STATUSES = ["PENDING", "QUOTED", "APPROVED", "PURCHASED", "AT_WAREHOUSE", "SHIPPED", "DONE"] as const;

const RequestUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  quantity: z.number().int().positive().optional(),
  description: z.string().optional(),
  img_url: z.string().optional(),
  quotePrice: z.number().nonnegative().optional(),
  finalPrice: z.number().nonnegative().optional(),
  status: z.enum(VALID_STATUSES).optional(),
  quotedById: z.uuid().nullable().optional(),
});

const BUCKET = process.env.MINIO_BUCKET || "source-desk";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const parsed = RequestUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }
    const { name, quantity, description, img_url, quotePrice, finalPrice, status, quotedById } = parsed.data;

    const existingRequest = await prisma.request.findUnique({
      where: { id },
      select: { id: true, img_url: true, status: true, customerId: true },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Customers can only edit their own requests
    if (session.user.role === "customer" && existingRequest.customerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        return NextResponse.json(
          { error: `Cannot change status from ${existingRequest.status} to ${status}` },
          { status: 400 },
        );
      }
    }

    // Delete replaced images from storage
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
            .catch((err: unknown) => console.error("Failed to delete old image:", err));
        }),
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (description !== undefined) updateData.description = description;
    if (img_url !== undefined) updateData.img_url = img_url;
    if (quotePrice !== undefined) updateData.quotePrice = quotePrice;
    if (finalPrice !== undefined) updateData.finalPrice = finalPrice;
    if (status !== undefined) updateData.status = status;
    if (quotedById !== undefined) updateData.quotedById = quotedById;

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

    await notifyUpdate();
    return NextResponse.json(request);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update request" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existingRequest = await prisma.request.findUnique({
      where: { id },
      select: { id: true, img_url: true, customerId: true },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Customers can only delete their own requests
    if (session.user.role === "customer" && existingRequest.customerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (existingRequest.img_url) {
      let urls: string[] = [];
      try {
        const parsed = JSON.parse(existingRequest.img_url);
        if (Array.isArray(parsed)) urls = parsed;
      } catch {
        if (existingRequest.img_url.startsWith("/api/image/")) urls = [existingRequest.img_url];
      }
      await Promise.all(
        urls.map((url) => {
          const match = url.match(/\/api\/image\/(.+)$/);
          if (!match) return Promise.resolve();
          return minio
            .send(new DeleteObjectCommand({ Bucket: BUCKET, Key: match[1] }))
            .catch((err) => console.error("Failed to delete image:", err));
        }),
      );
    }

    await prisma.request.delete({ where: { id } });
    await notifyUpdate();
    return NextResponse.json({ message: "Request deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete request" },
      { status: 500 },
    );
  }
}
