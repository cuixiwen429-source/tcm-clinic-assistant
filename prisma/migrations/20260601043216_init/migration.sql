-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'DOCTOR',
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "gender" TEXT,
    "birthDate" DATETIME,
    "age" INTEGER,
    "phone" TEXT,
    "address" TEXT,
    "allergies" TEXT,
    "constitution" TEXT,
    "chronicDisease" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "visitDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chiefComplaint" TEXT,
    "presentIllness" TEXT,
    "pastHistory" TEXT,
    "symptomSummary" TEXT,
    "constitution" TEXT,
    "rawTranscription" TEXT,
    "editedHistory" TEXT,
    "huXishuAnalysis" TEXT,
    "zhangXichunAnalysis" TEXT,
    "niHaixiaAnalysis" TEXT,
    "liKeAnalysis" TEXT,
    "doctorFinalPattern" TEXT,
    "doctorFinalPathogenesis" TEXT,
    "tongueImage" TEXT,
    "faceImage" TEXT,
    "tongueAnalysis" TEXT,
    "faceAnalysis" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Consultation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Consultation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "consultationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "formulaName" TEXT,
    "formulaClass" TEXT,
    "source" TEXT NOT NULL DEFAULT 'AI',
    "herbs" TEXT NOT NULL DEFAULT '[]',
    "totalDoses" INTEGER NOT NULL DEFAULT 7,
    "decoctionMethod" TEXT,
    "usageInstruction" TEXT,
    "precautions" TEXT,
    "editorId" TEXT,
    "changeDescription" TEXT,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" DATETIME,
    "pdfPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Prescription_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Prescription_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComplianceCheck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prescriptionId" TEXT NOT NULL,
    "checkType" TEXT NOT NULL,
    "herbName" TEXT,
    "conflictWith" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "detail" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolutionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComplianceCheck_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskPrediction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "consultationId" TEXT NOT NULL,
    "predictedRisks" TEXT NOT NULL,
    "patientFriendlyText" TEXT,
    "doctorConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" DATETIME,
    "confirmedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiskPrediction_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Advice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "consultationId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'MEDICAL',
    "adviceContent" TEXT NOT NULL,
    "editedContent" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Advice_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HerbReference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "pinyin" TEXT,
    "pharmacopoeiaMin" REAL,
    "pharmacopoeiaMax" REAL,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "category" TEXT,
    "nature" TEXT,
    "taste" TEXT,
    "meridian" TEXT,
    "toxicity" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HerbPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "herbId" TEXT NOT NULL,
    "spec" TEXT,
    "origin" TEXT,
    "wholesalePrice" REAL,
    "retailPrice" REAL,
    "unit" TEXT NOT NULL DEFAULT 'g',
    "sourceNote" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HerbPrice_herbId_fkey" FOREIGN KEY ("herbId") REFERENCES "HerbReference" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComplianceRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleType" TEXT NOT NULL,
    "herbA" TEXT NOT NULL,
    "herbB" TEXT,
    "category" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "description" TEXT NOT NULL,
    "sourceNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CostCalculation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prescriptionId" TEXT NOT NULL,
    "totalCost" REAL NOT NULL,
    "breakdown" TEXT NOT NULL,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculatedBy" TEXT,
    CONSTRAINT "CostCalculation_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "HerbReference_name_key" ON "HerbReference"("name");
