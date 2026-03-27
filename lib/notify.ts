import prisma from "@/lib/prisma";

export async function notifyUpdate() {
  try {
    await prisma.$executeRaw`SELECT pg_notify('source_desk_updates', '')`;
  } catch (e) {
    console.error("Failed to send notify:", e);
  }
}
