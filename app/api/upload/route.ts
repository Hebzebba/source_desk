import { NextRequest, NextResponse } from "next/server";
import { minioClient, ensureBucket, BUCKET_NAME } from "@/lib/minio";
import { randomUUID } from "crypto";
import path from "path";

/** 10 MB upload limit */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Allowed MIME types */
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

/*
POST /api/upload
Accepts multipart/form-data with a single "file" field.
Returns { key, url } on success.
*/
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: `Unsupported file type '${file.type}'. Allowed: JPEG, PNG, GIF, WEBP, PDF.`,
        },
        { status: 415 },
      );
    }

    // Validate file size
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds the 10 MB size limit." },
        { status: 413 },
      );
    }

    // Build a unique object key that preserves the original extension
    const ext = path.extname(file.name || "").toLowerCase();
    const objectKey = `uploads/${randomUUID()}${ext}`;

    await ensureBucket();

    await minioClient.putObject(BUCKET_NAME, objectKey, buffer, buffer.byteLength, {
      "Content-Type": file.type,
    });

    // Construct a public-facing URL.
    // In production this would typically be a pre-signed URL or a CDN URL;
    // here we expose the internal endpoint so the app can reference the object.
    const minioEndpoint = process.env.MINIO_ENDPOINT || "minio.railway.internal";
    const minioPort = process.env.MINIO_PORT || "9000";
    const useSSL = process.env.MINIO_USE_SSL === "true";
    const protocol = useSSL ? "https" : "http";
    const url = `${protocol}://${minioEndpoint}:${minioPort}/${BUCKET_NAME}/${objectKey}`;

    return NextResponse.json({ key: objectKey, url }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload file",
      },
      { status: 500 },
    );
  }
}
