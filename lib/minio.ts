import { Client } from "minio";

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "minio.railway.internal";
const MINIO_PORT = parseInt(process.env.MINIO_PORT || "9000", 10);
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || "";
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || "";
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === "true";

export const BUCKET_NAME = process.env.MINIO_BUCKET || "user-uploads";

export const minioClient = new Client({
  endPoint: MINIO_ENDPOINT,
  port: MINIO_PORT,
  useSSL: MINIO_USE_SSL,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

/**
 * Ensures the target bucket exists, creating it if necessary.
 * Call this once before performing any upload operations.
 */
export async function ensureBucket(bucket: string = BUCKET_NAME): Promise<void> {
  const exists = await minioClient.bucketExists(bucket);
  if (!exists) {
    await minioClient.makeBucket(bucket, "us-east-1");
  }
}
