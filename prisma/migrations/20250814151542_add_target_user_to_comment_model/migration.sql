-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "targetUserId" INTEGER;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
