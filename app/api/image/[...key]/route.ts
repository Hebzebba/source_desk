import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { minio } from "@/lib/minio";

const BUCKET = process.env.MINIO_BUCKET || "source-desk";

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  try {
    const { key } = await params;
    const objectKey = key.join("/");

    const response = await minio.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: objectKey,
      }),
    );

    const stream = response.Body as ReadableStream;
    return new NextResponse(stream, {
      headers: {
        "Content-Type": response.ContentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
