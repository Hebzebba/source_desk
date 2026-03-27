import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { minio } from "@/lib/minio";

const BUCKET = process.env.MINIO_BUCKET || "source-desk";

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
