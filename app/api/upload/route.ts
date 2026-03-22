import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { minio } from "@/lib/minio";
import { randomUUID } from "crypto";

const BUCKET = process.env.MINIO_BUCKET || "source-desk";

const MAX_FILES = 3;

export async function POST(req: NextRequest) {
  console.log("Upload debug:", {
    endpoint: process.env.MINIO_ENDPOINT ?? "MISSING",
    bucket: BUCKET,
    MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY ?? "MISSING",
    MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY ? "SET" : "MISSING",
    MINIO_ROOT_USER: process.env.MINIO_ROOT_USER ?? "MISSING",
    MINIO_ROOT_PASSWORD: process.env.MINIO_ROOT_PASSWORD ? "SET" : "MISSING",
  });
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Maximum ${MAX_FILES} images allowed` }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const MAX_SIZE = 5 * 1024 * 1024;

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: "Only JPEG, PNG, WebP, and GIF images are allowed" }, { status: 400 });
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: "Each file must be under 5MB" }, { status: 400 });
      }
    }

    const endpoint = process.env.MINIO_ENDPOINT!.replace(/\/$/, "");
    const urls: string[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() || "jpg";
      const key = `requests/${randomUUID()}.${ext}`;

      await minio.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: buffer,
          ContentType: file.type,
        }),
      );

      urls.push(`${endpoint}/${BUCKET}/${key}`);
    }

    return NextResponse.json({ urls }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
