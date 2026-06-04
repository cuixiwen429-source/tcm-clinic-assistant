import type { JWTPayload } from "@/lib/auth/jwt";

export function patientAccessWhere(session: JWTPayload, patientId: string) {
  if (session.role === "ADMIN") return { id: patientId };

  return {
    id: patientId,
    OR: [
      { createdBy: session.userId },
      { consultations: { some: { doctorId: session.userId } } },
    ],
  };
}

export function consultationAccessWhere(session: JWTPayload, consultationId: string) {
  if (session.role === "ADMIN") return { id: consultationId };

  return {
    id: consultationId,
    doctorId: session.userId,
  };
}
