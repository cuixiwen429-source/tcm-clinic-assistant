export type ConsultationProgressStep =
  | "patient"
  | "tongue"
  | "face"
  | "history"
  | "differentiate"
  | "diagnosis"
  | "formula"
  | "confirm";

export type ConsultationCaptureStep =
  | "patient"
  | "tongue"
  | "face"
  | "transcribe"
  | "history";

export interface ConsultationProgressData {
  patientId?: unknown;
  status?: unknown;
  tongueImage?: unknown;
  faceImage?: unknown;
  rawTranscription?: unknown;
  editedHistory?: unknown;
  huXishuAnalysis?: unknown;
  zhangXichunAnalysis?: unknown;
  niHaixiaAnalysis?: unknown;
  liKeAnalysis?: unknown;
  doctorFinalPattern?: unknown;
  prescriptions?: unknown;
}

const finalizedStatuses = new Set(["FINALIZED", "ARCHIVED"]);
const captureSteps = new Set<ConsultationCaptureStep>([
  "patient",
  "tongue",
  "face",
  "transcribe",
  "history",
]);

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function hasConsultationValue(value: unknown): boolean {
  const text = asString(value)?.trim();
  if (!text) return false;
  return !["null", "undefined", "{}", "[]"].includes(text);
}

export function parseConsultationImageList(value: unknown): string[] {
  const text = asString(value)?.trim();
  if (!text || ["null", "undefined", "[]"].includes(text)) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
    if (typeof parsed === "string" && parsed.trim()) return [parsed.trim()];
  } catch {
    return [text];
  }

  return [];
}

export function parseConsultationJsonObject(value: unknown): Record<string, unknown> | null {
  const text = asString(value)?.trim();
  if (!text || ["null", "undefined", "{}"].includes(text)) return null;

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeConsultationCaptureStep(step: string | null): ConsultationCaptureStep | null {
  if (!step) return null;
  return captureSteps.has(step as ConsultationCaptureStep) ? (step as ConsultationCaptureStep) : null;
}

export function hasConsultationImage(value: unknown): boolean {
  return parseConsultationImageList(value).length > 0;
}

export function hasConsultationEditedHistory(consultation: ConsultationProgressData): boolean {
  return hasConsultationValue(consultation.editedHistory);
}

export function hasConsultationAiAnalysis(consultation: ConsultationProgressData): boolean {
  return [
    consultation.huXishuAnalysis,
    consultation.zhangXichunAnalysis,
    consultation.niHaixiaAnalysis,
    consultation.liKeAnalysis,
  ].some(hasConsultationValue);
}

export function hasConsultationPrescription(consultation: ConsultationProgressData): boolean {
  if (Array.isArray(consultation.prescriptions) && consultation.prescriptions.length > 0) {
    return true;
  }
  return asString(consultation.status) === "PRESCRIBED";
}

export function hasConsultationConfirmedPrescription(consultation: ConsultationProgressData): boolean {
  if (!Array.isArray(consultation.prescriptions)) return false;
  return consultation.prescriptions.some((prescription) => {
    if (!prescription || typeof prescription !== "object") return false;
    return Boolean((prescription as { isConfirmed?: unknown }).isConfirmed);
  });
}

export function isConsultationFinalized(consultation: ConsultationProgressData): boolean {
  const status = asString(consultation.status);
  return status ? finalizedStatuses.has(status) : false;
}

export function getConsultationCurrentStepKey(consultation: ConsultationProgressData): ConsultationProgressStep {
  if (!hasConsultationValue(consultation.patientId)) return "patient";
  if (isConsultationFinalized(consultation)) return "confirm";
  if (hasConsultationConfirmedPrescription(consultation)) return "confirm";
  if (hasConsultationPrescription(consultation)) return "confirm";
  if (hasConsultationValue(consultation.doctorFinalPattern)) return "formula";
  if (hasConsultationAiAnalysis(consultation)) return "diagnosis";
  if (hasConsultationEditedHistory(consultation) || asString(consultation.status) === "AI_ASSISTED") {
    return "differentiate";
  }
  // New order: patient → transcribe → tongue → face → history
  if (hasConsultationImage(consultation.faceImage)) return "history";
  if (hasConsultationImage(consultation.tongueImage)) return "face";
  if (hasConsultationValue(consultation.rawTranscription)) return "tongue";
  return "history";
}

export function getConsultationCaptureResumeStep(consultation: ConsultationProgressData): ConsultationCaptureStep {
  if (!hasConsultationValue(consultation.patientId)) return "patient";
  if (hasConsultationEditedHistory(consultation)) return "history";
  // New order: patient → transcribe → tongue → face → history
  if (hasConsultationImage(consultation.faceImage)) return "history";
  if (hasConsultationImage(consultation.tongueImage)) return "face";
  if (hasConsultationValue(consultation.rawTranscription)) return "tongue";
  return "transcribe";
}

function consultationCaptureHref(consultationId: string, step: ConsultationCaptureStep): string {
  const query = new URLSearchParams({
    consultationId,
    step,
  });
  return `/consultations/new?${query.toString()}`;
}

function pathId(id: string): string {
  return encodeURIComponent(id);
}

export function getConsultationStepHref(
  consultationId: string,
  consultation: ConsultationProgressData,
  step: ConsultationProgressStep
): string {
  if (step === "patient") {
    const patientId = asString(consultation.patientId);
    return patientId ? `/patients/${pathId(patientId)}` : consultationCaptureHref(consultationId, "patient");
  }

  if (isConsultationFinalized(consultation)) {
    return `/consultations/${pathId(consultationId)}#${step}`;
  }

  if (step === "tongue") return consultationCaptureHref(consultationId, "tongue");
  if (step === "face") return consultationCaptureHref(consultationId, "face");
  if (step === "history") {
    return consultationCaptureHref(
      consultationId,
      hasConsultationEditedHistory(consultation) ? "history" : "transcribe"
    );
  }
  if (step === "confirm" && hasConsultationPrescription(consultation)) {
    return `/consultations/${pathId(consultationId)}/prescription`;
  }
  if (!hasConsultationEditedHistory(consultation)) {
    return consultationCaptureHref(consultationId, getConsultationCaptureResumeStep(consultation));
  }

  return `/consultations/${pathId(consultationId)}/ai`;
}

export function getConsultationResumeHref(
  consultationId: string,
  consultation: ConsultationProgressData
): string {
  return getConsultationStepHref(
    consultationId,
    consultation,
    getConsultationCurrentStepKey(consultation)
  );
}
