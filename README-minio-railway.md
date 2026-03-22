# MinIO on Railway for a Next.js App

This guide shows how to run MinIO as a separate Railway service and connect your Next.js app to it over Railway's private network.

## What you are setting up

- A **MinIO** service on Railway using the public Docker image
- A **persistent volume** mounted at `/data`
- A **custom start command** for MinIO
- A **private network connection** from your Next.js service to MinIO

## 1. Create the MinIO service

Inside your existing Railway project:

1. Click **New** → **Service** → **Docker Image**
2. Use this image:

```text
quay.io/minio/minio:latest
```

## 2. Set the MinIO start command

Open the **MinIO service** and go to:

**Settings → Deploy → Custom Start Command**

Paste this command:

```bash
minio server /data --console-address ":9001"
```

## 3. Add MinIO environment variables

Open the **Variables** tab in the MinIO service and add:

```env
MINIO_ROOT_USER=your_admin_user
MINIO_ROOT_PASSWORD=your_strong_password
```

Use a strong password.

## 4. Attach a persistent volume

From the Railway project canvas:

1. Right-click the **MinIO service**
2. Click **Attach Volume**
3. Set the mount path to:

```text
/data
```

This is where MinIO will store your files.

## 5. Optional: expose the MinIO console

You do **not** need to expose MinIO publicly for your Next.js app to use it.

Only add a public domain if you want browser access to the MinIO admin console.

If you do:
- point **9001** to the console
- point **9000** only if you intentionally want the S3 API public

For most apps, keep MinIO private.

## 6. Connect your Next.js app to MinIO

Open your **Next.js service** in Railway and go to the **Variables** tab.

Add:

```env
MINIO_ENDPOINT=http://${{MinIO.RAILWAY_PRIVATE_DOMAIN}}:9000
MINIO_BUCKET=uploads
MINIO_ACCESS_KEY=${{MinIO.MINIO_ROOT_USER}}
MINIO_SECRET_KEY=${{MinIO.MINIO_ROOT_PASSWORD}}
```

Replace `MinIO` with the exact name of your MinIO service in Railway.

You can change `uploads` to any bucket name you want.

## 7. Install the S3 client in your Next.js app

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## 8. Create the MinIO client

Create `src/lib/minio.ts`:

```ts
import { S3Client } from "@aws-sdk/client-s3";

export const minio = new S3Client({
  region: "auto",
  endpoint: process.env.MINIO_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
});
```

## 9. Add a simple upload route

Create `src/app/api/upload/route.ts`:

```ts
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { minio } from "@/lib/minio";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/\s+/g, "-");
    const key = `${Date.now()}-${randomUUID()}-${safeName}`;

    await minio.send(
      new PutObjectCommand({
        Bucket: process.env.MINIO_BUCKET!,
        Key: key,
        Body: bytes,
        ContentType: file.type || "application/octet-stream",
      })
    );

    return Response.json({ ok: true, key });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
```

## 10. Create the bucket in MinIO

Before uploading, create the bucket once from the MinIO console.

Example bucket name:

```text
uploads
```

That bucket name must match `MINIO_BUCKET` in your Next.js service.

## 11. Recommended setup

For a normal app:

- keep MinIO **private**
- upload through **Next.js server routes**
- do **not** expose MinIO credentials to the browser
- store only the returned object key in your database

## Troubleshooting

### Upload fails with connection errors

Check that:
- both services are in the **same Railway project/environment**
- `MINIO_ENDPOINT` uses the **private domain**
- you included port `:9000`

### Files disappear after redeploy

That usually means the MinIO service does **not** have a volume mounted at `/data`.

### Invalid access key or secret key

Check that the Next.js service references the MinIO service variables correctly:

```env
MINIO_ACCESS_KEY=${{MinIO.MINIO_ROOT_USER}}
MINIO_SECRET_KEY=${{MinIO.MINIO_ROOT_PASSWORD}}
```

## Summary

You need three main things:

1. A MinIO Railway service using `quay.io/minio/minio:latest`
2. A Railway volume mounted at `/data`
3. A private connection from Next.js to MinIO using `RAILWAY_PRIVATE_DOMAIN`

Once that is in place, your Next.js app can upload files to MinIO like an S3-compatible object store.
