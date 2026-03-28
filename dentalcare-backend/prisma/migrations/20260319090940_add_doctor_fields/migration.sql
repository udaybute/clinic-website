-- AlterTable
ALTER TABLE "users" ADD COLUMN     "availability" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "consultationFee" DOUBLE PRECISION,
ADD COLUMN     "experience" INTEGER,
ADD COLUMN     "qualifications" TEXT;
