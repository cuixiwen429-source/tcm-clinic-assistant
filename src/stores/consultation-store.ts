"use client";

import { create } from "zustand";

export interface HerbDraft {
  name: string;
  dose: number;
  note?: string;
}

export interface FormulaDraft {
  plan_type: string;
  formula_name: string;
  source: string;
  six_channel_pattern?: string;
  pathogenesis: string;
  match_score: number;
  herbs: HerbDraft[];
  reasoning_summary: string;
  contraindications: string[];
  doctor_checkpoints: string[];
}

type WizardStep = "patient" | "transcribe" | "history" | "differentiate" | "formula" | "prescription";

interface ConsultationState {
  // Wizard state
  step: WizardStep;
  consultationId: string | null;
  patientId: string | null;

  // Transcription
  rawText: string;
  structuredHistory: Record<string, unknown> | null;
  isTranscribing: boolean;

  // Differentiation
  differentiations: Record<string, unknown> | null;
  isDifferentiating: boolean;

  // Formula
  formulas: FormulaDraft[] | null;
  selectedFormula: FormulaDraft | null;
  isGeneratingFormula: boolean;

  // Actions
  setStep: (step: WizardStep) => void;
  setConsultationId: (id: string) => void;
  setPatientId: (id: string) => void;
  setRawText: (text: string) => void;
  setStructuredHistory: (history: Record<string, unknown> | null) => void;
  setIsTranscribing: (v: boolean) => void;
  setDifferentiations: (d: Record<string, unknown> | null) => void;
  setIsDifferentiating: (v: boolean) => void;
  setFormulas: (f: FormulaDraft[] | null) => void;
  setSelectedFormula: (f: FormulaDraft | null) => void;
  setIsGeneratingFormula: (v: boolean) => void;
  reset: () => void;
}

const initialState = {
  step: "patient" as WizardStep,
  consultationId: null,
  patientId: null,
  rawText: "",
  structuredHistory: null,
  isTranscribing: false,
  differentiations: null,
  isDifferentiating: false,
  formulas: null,
  selectedFormula: null,
  isGeneratingFormula: false,
};

export const useConsultationStore = create<ConsultationState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step }),
  setConsultationId: (id) => set({ consultationId: id }),
  setPatientId: (id) => set({ patientId: id }),
  setRawText: (text) => set({ rawText: text }),
  setStructuredHistory: (history) => set({ structuredHistory: history }),
  setIsTranscribing: (v) => set({ isTranscribing: v }),
  setDifferentiations: (d) => set({ differentiations: d }),
  setIsDifferentiating: (v) => set({ isDifferentiating: v }),
  setFormulas: (f) => set({ formulas: f }),
  setSelectedFormula: (f) => set({ selectedFormula: f }),
  setIsGeneratingFormula: (v) => set({ isGeneratingFormula: v }),
  reset: () => set(initialState),
}));
