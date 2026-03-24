-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "quotedById" TEXT;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_quotedById_fkey" FOREIGN KEY ("quotedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
