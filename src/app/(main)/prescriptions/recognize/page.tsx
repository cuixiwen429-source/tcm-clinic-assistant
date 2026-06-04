"use client";

import { PrescriptionRecognizer } from "@/components/prescriptions/PrescriptionRecognizer";

export default function DoctorPrescriptionRecognizePage() {
  return (
    <PrescriptionRecognizer
      apiEndpoint="/api/doctor/prescriptions/ai-parse"
      ocrEndpoint="/api/doctor/prescriptions/ocr"
    />
  );
}
