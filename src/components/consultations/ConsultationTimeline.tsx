"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import {
  User, Camera, Eye, Mic, Brain, CheckCircle, Pill, ClipboardCheck,
} from "lucide-react";
import {
  getConsultationCurrentStepKey,
  getConsultationStepHref,
  hasConsultationAiAnalysis,
  hasConsultationConfirmedPrescription,
  hasConsultationEditedHistory,
  hasConsultationImage,
  hasConsultationPrescription,
  hasConsultationValue,
  isConsultationFinalized,
} from "@/lib/consultations/progress";
import type { ConsultationProgressStep } from "@/lib/consultations/progress";

interface ConsultationTimelineProps {
  consultationId: string;
  consultation: {
    patientId?: string;
    status?: string;
    tongueImage?: string | null;
    faceImage?: string | null;
    rawTranscription?: string | null;
    editedHistory?: string | null;
    huXishuAnalysis?: string | null;
    zhangXichunAnalysis?: string | null;
    niHaixiaAnalysis?: string | null;
    liKeAnalysis?: string | null;
    doctorFinalPattern?: string | null;
    prescriptions?: Array<{ isConfirmed?: boolean }>;
  };
}

interface StepDef {
  key: ConsultationProgressStep;
  label: string;
  icon: React.ElementType;
  check: (c: ConsultationTimelineProps["consultation"]) => boolean;
}

export function ConsultationTimeline({ consultationId, consultation }: ConsultationTimelineProps) {
  const router = useRouter();

  const steps: StepDef[] = [
    { key: "patient", label: "患者建档", icon: User,
      check: (c) => hasConsultationValue(c.patientId),
    },
    { key: "history", label: "问诊转写", icon: Mic,
      check: (c) => hasConsultationEditedHistory(c),
    },
    { key: "tongue", label: "舌象采集", icon: Camera,
      check: (c) => hasConsultationImage(c.tongueImage),
    },
    { key: "face", label: "面相采集", icon: Eye,
      check: (c) => hasConsultationImage(c.faceImage),
    },
    { key: "differentiate", label: "AI辨证", icon: Brain,
      check: (c) => hasConsultationAiAnalysis(c),
    },
    { key: "diagnosis", label: "最终诊断", icon: CheckCircle,
      check: (c) => hasConsultationValue(c.doctorFinalPattern),
    },
    { key: "formula", label: "方剂生成", icon: Pill,
      check: (c) => hasConsultationPrescription(c),
    },
    { key: "confirm", label: "处方确认", icon: ClipboardCheck,
      check: (c) => hasConsultationConfirmedPrescription(c) || isConsultationFinalized(c),
    },
  ];

  const currentStepKey = getConsultationCurrentStepKey(consultation);
  const currentIdx = Math.max(steps.findIndex(s => s.key === currentStepKey), 0);

  const handleStepClick = (step: StepDef) => {
    router.push(getConsultationStepHref(consultationId, consultation, step.key));
  };

  return (
    <div className="space-y-6">
      {/* Desktop: Horizontal steps */}
      <div className="hidden md:block">
        <div className="flex items-center gap-0 overflow-x-auto pb-2">
          {steps.map((step, idx) => {
            const isCompleted = step.check(consultation);
            const isCurrent = step.key === currentStepKey;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex items-center flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleStepClick(step)}
                  disabled={false}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-lg min-w-[70px] transition-all duration-200 cursor-pointer",
                    isCompleted
                      ? "text-green-700 hover:bg-green-50"
                      : isCurrent
                        ? "text-primary"
                        : "text-muted-foreground/50 hover:bg-muted"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center h-10 w-10 rounded-full border-2",
                    isCompleted
                      ? "border-green-500 bg-green-50"
                      : isCurrent
                        ? "border-primary bg-primary/10"
                        : "border-muted-foreground/25 bg-transparent"
                  )}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Icon className={cn(
                        "h-5 w-5",
                        isCurrent ? "text-primary" : "text-muted-foreground/50"
                      )} />
                    )}
                  </div>
                  <span className="text-[11px] text-center leading-tight font-medium">
                    {step.label}
                  </span>
                  {isCurrent && !isCompleted && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/50 text-primary">
                      当前
                    </Badge>
                  )}
                </button>
                {idx < steps.length - 1 && (
                  <div className={cn(
                    "h-0.5 w-6 flex-shrink-0",
                    idx < currentIdx ? "bg-green-300" : "bg-muted-foreground/15"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Vertical timeline */}
      <div className="md:hidden space-y-0">
        {steps.map((step, idx) => {
          const isCompleted = step.check(consultation);
          const isCurrent = step.key === currentStepKey;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex gap-3">
              {/* Connector line */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-full border-2 flex-shrink-0",
                  isCompleted
                    ? "border-green-500 bg-green-50"
                    : isCurrent
                      ? "border-primary bg-primary/10"
                      : "border-muted-foreground/20 bg-transparent"
                )}>
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Icon className={cn(
                      "h-4 w-4",
                      isCurrent ? "text-primary" : "text-muted-foreground/40"
                    )} />
                  )}
                </div>
                {idx < steps.length - 1 && (
                  <div className={cn(
                    "w-0.5 h-6",
                    idx < currentIdx ? "bg-green-300" : "bg-muted-foreground/15"
                  )} />
                )}
              </div>
              {/* Content */}
              <div className="pb-4">
                <button
                  type="button"
                  onClick={() => handleStepClick(step)}
                  disabled={false}
                  className="text-left cursor-pointer"
                >
                  <span className={cn(
                    "text-sm font-medium",
                    isCompleted ? "text-green-700" : isCurrent ? "text-primary" : "text-muted-foreground/50 hover:text-foreground"
                  )}>
                    {step.label}
                  </span>
                  {isCurrent && !isCompleted && (
                    <Badge variant="outline" className="ml-2 text-[9px] px-1 py-0 h-4 border-primary/50 text-primary">
                      当前
                    </Badge>
                  )}
                  {isCompleted && (
                    <span className="ml-2 text-[10px] text-green-600">✓ 已完成</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
