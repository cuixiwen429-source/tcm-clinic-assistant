-- AlterTable
ALTER TABLE "Consultation" ADD COLUMN "pharmacyId" TEXT;

-- CreateTable
CREATE TABLE "PharmacyBinding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pharmacyId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PharmacyBinding_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PharmacyBinding_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyBinding_pharmacyId_doctorId_key" ON "PharmacyBinding"("pharmacyId", "doctorId");
