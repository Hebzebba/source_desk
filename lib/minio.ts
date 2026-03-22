import { S3Client } from "@aws-sdk/client-s3";

export const minio = new S3Client({
  region: "auto",
  endpoint: process.env.MINIO_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: (process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER)!,
    secretAccessKey: (process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD)!,
  },
});