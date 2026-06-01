import { z } from "zod";

// Structured medical history schema
export const StructuredHistorySchema = z.object({
  chief_complaint: z.string().describe("主诉"),
  present_illness: z.string().describe("现病史"),
  symptom_summary: z.object({
    cold_heat: z.string().optional().describe("寒热"),
    sweating: z.string().optional().describe("汗出"),
    diet: z.string().optional().describe("饮食"),
    stool_urine: z.string().optional().describe("二便"),
    sleep: z.string().optional().describe("睡眠"),
    tongue_pulse: z.string().optional().describe("舌脉"),
  }).describe("症状总结"),
  constitution: z.string().optional().describe("体质特征"),
  allergy_history: z.string().optional().describe("过敏史"),
  chronic_disease_history: z.string().optional().describe("基础病史"),
  missing_information: z.array(z.string()).describe("仍需医生补问的问题"),
});

export const SynthesizeResultSchema = StructuredHistorySchema.extend({
  merge_notes: z.string().describe("综合汇总修正说明"),
});

export type StructuredHistory = z.infer<typeof StructuredHistorySchema>;

// Herb item in a formula
export const HerbItemSchema = z.object({
  name: z.string().describe("药名"),
  dose: z.number().describe("剂量(g)"),
  note: z.string().optional().describe("先煎/后下/包煎/烊化等"),
});

export type HerbItem = z.infer<typeof HerbItemSchema>;

// Formula tier plan
export const FormulaPlanSchema = z.object({
  plan_type: z.enum(["首选", "优化", "专科", "专项"]).describe("方案类型"),
  formula_name: z.string().describe("方名"),
  source: z.string().describe("出处"),
  six_channel_pattern: z.string().optional().describe("六经分型"),
  pathogenesis: z.string().describe("病机"),
  match_score: z.number().min(0).max(100).describe("匹配度评分"),
  herbs: z.array(HerbItemSchema).describe("药物组成"),
  reasoning_summary: z.string().describe("简要依据"),
  contraindications: z.array(z.string()).describe("禁忌"),
  doctor_checkpoints: z.array(z.string()).describe("医生需确认项"),
});

export type FormulaPlan = z.infer<typeof FormulaPlanSchema>;

// Four-system differentiation results
export const DifferentiationResultSchema = z.object({
  pattern: z.string().describe("辨证分型"),
  formula_match: z.string().describe("方证匹配"),
  key_symptoms: z.union([z.string(), z.array(z.string())]).transform(v =>
    Array.isArray(v) ? v.join("；") : v
  ).describe("关键症状依据"),
  classic_reference: z.string().optional().describe("经典条文参考"),
  match_score: z.number().min(0).max(100).describe("匹配度评分"),
  qi_blood_analysis: z.string().optional().describe("气机气血分析（张锡纯体系）"),
  drug_pairs: z.array(z.string()).optional().describe("可选药对"),
  modification_direction: z.string().optional().describe("化裁方向"),
  disease_extension: z.string().optional().describe("病证延伸（倪海厦体系）"),
  specialty_alert: z.string().optional().describe("专科提示"),
  transmission_risk: z.string().optional().describe("传变风险"),
  contraindication_warning: z.string().optional().describe("禁忌预警"),
  fuyang_analysis: z.string().optional().describe("扶阳分析（李可体系）"),
  severe_mode_note: z.string().optional().describe("重症版提示"),
  doctor_checkpoints: z.array(z.string()).describe("医生需确认项"),
});

export type DifferentiationResult = z.infer<typeof DifferentiationResultSchema>;

// Risk prediction
export const RiskPredictionSchema = z.object({
  risk_overall_level: z.enum(["低", "中", "高"]).describe("综合风险等级"),
  risk_items: z.array(z.object({
    formula_type: z.string().describe("方剂类型"),
    suitable_constitution: z.array(z.string()).describe("适配体质"),
    sensitive_constitution: z.array(z.string()).describe("禁忌或敏感体质"),
    possible_reactions: z.array(z.string()).describe("可能反应"),
    risk_level: z.enum(["低", "中", "高"]).describe("风险等级"),
    management_plan: z.array(z.string()).describe("处理方案"),
    doctor_warning: z.string().describe("医生提示"),
  })),
  guangdong_constitution_focus: z.object({
    damp_heat: z.string().optional().describe("湿热体质风险"),
    yin_deficiency: z.string().optional().describe("阴虚体质风险"),
    spleen_deficiency_dampness: z.string().optional().describe("脾虚湿盛风险"),
  }).optional(),
  must_follow_up: z.array(z.string()).describe("需要复诊或随访的情况"),
});

export type RiskPrediction = z.infer<typeof RiskPredictionSchema>;

// Advice
export const AdviceResultSchema = z.object({
  decoction_guide: z.string().describe("煎服指南"),
  dietary_advice: z.object({
    recommended: z.array(z.string()).describe("宜食"),
    avoid: z.array(z.string()).describe("忌食"),
  }).describe("饮食宜忌"),
  lifestyle_advice: z.array(z.string()).describe("生活调护"),
  side_effect_notice: z.string().optional().describe("副作用告知"),
  follow_up_suggestion: z.string().describe("复诊建议"),
});

export type AdviceResult = z.infer<typeof AdviceResultSchema>;

// Follow-up comparison
export const FollowUpComparisonSchema = z.object({
  symptom_changes: z.array(z.string()).describe("症状变化"),
  pattern_changes: z.array(z.string()).describe("辨证变化"),
  formula_changes: z.array(z.string()).describe("处方变化"),
  previous_adverse_reactions: z.array(z.string()).describe("上次不良反应"),
  adjustment_suggestions: z.array(z.string()).describe("调方参考"),
  doctor_checkpoints: z.array(z.string()).describe("医生需确认"),
});

export type FollowUpComparison = z.infer<typeof FollowUpComparisonSchema>;
