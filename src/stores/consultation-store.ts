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

type WizardStep =
  | "patient" | "tongue" | "face" | "transcribe" | "history"
  | "differentiate" | "formula" | "prescription";

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

  // Tongue & Face
  tongueImage: string | null;
  faceImage: string | null;
  tongueAnalysis: Record<string, unknown> | null;
  faceAnalysis: Record<string, unknown> | null;
  isAnalyzingTongue: boolean;
  isAnalyzingFace: boolean;

  // Actions
  setStep: (step: WizardStep) => void;
  setConsultationId: (id: string) => void;
  setPatientId: (id: string) => void;
  setRawText: (textOrFn: string | ((prev: string) => string)) => void;
  setStructuredHistory: (history: Record<string, unknown> | null) => void;
  setIsTranscribing: (v: boolean) => void;
  setDifferentiations: (d: Record<string, unknown> | null) => void;
  setIsDifferentiating: (v: boolean) => void;
  setFormulas: (f: FormulaDraft[] | null) => void;
  setSelectedFormula: (f: FormulaDraft | null) => void;
  setIsGeneratingFormula: (v: boolean) => void;
  setTongueImage: (url: string | null) => void;
  setFaceImage: (url: string | null) => void;
  setTongueAnalysis: (a: Record<string, unknown> | null) => void;
  setFaceAnalysis: (a: Record<string, unknown> | null) => void;
  setIsAnalyzingTongue: (v: boolean) => void;
  setIsAnalyzingFace: (v: boolean) => void;
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
  tongueImage: null,
  faceImage: null,
  tongueAnalysis: null,
  faceAnalysis: null,
  isAnalyzingTongue: false,
  isAnalyzingFace: false,
};

export const useConsultationStore = create<ConsultationState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step }),
  setConsultationId: (id) => set({ consultationId: id }),
  setPatientId: (id) => set({ patientId: id }),
  setRawText: (textOrFn: string | ((prev: string) => string)) => set((state) => ({ rawText: typeof textOrFn === "function" ? textOrFn(state.rawText) : textOrFn })),
  setStructuredHistory: (history) => set({ structuredHistory: history }),
  setIsTranscribing: (v) => set({ isTranscribing: v }),
  setDifferentiations: (d) => set({ differentiations: d }),
  setIsDifferentiating: (v) => set({ isDifferentiating: v }),
  setFormulas: (f) => set({ formulas: f }),
  setSelectedFormula: (f) => set({ selectedFormula: f }),
  setIsGeneratingFormula: (v) => set({ isGeneratingFormula: v }),
  setTongueImage: (url) => set({ tongueImage: url }),
  setFaceImage: (url) => set({ faceImage: url }),
  setTongueAnalysis: (a) => set({ tongueAnalysis: a }),
  setFaceAnalysis: (a) => set({ faceAnalysis: a }),
  setIsAnalyzingTongue: (v) => set({ isAnalyzingTongue: v }),
  setIsAnalyzingFace: (v) => set({ isAnalyzingFace: v }),
  reset: () => set(initialState),
}));
