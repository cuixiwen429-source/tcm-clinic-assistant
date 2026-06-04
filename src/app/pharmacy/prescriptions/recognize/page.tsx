"use client";

import { PrescriptionRecognizer } from "@/components/prescriptions/PrescriptionRecognizer";

export default function PharmacyPrescriptionRecognizePage() {
  return (
    <PrescriptionRecognizer
      apiEndpoint="/api/pharmacy/prescriptions/ai-parse"
      ocrEndpoint="/api/pharmacy/prescriptions/ocr"
    />
  );
}
