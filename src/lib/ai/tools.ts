import type OpenAI from "openai";

export const AI_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_patient_records",
      description: "检索患者历史档案，可按姓名、手机号、日期、六经分型或核心用药关键词搜索",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "患者姓名" },
          phone: { type: "string", description: "手机号" },
          keyword: { type: "string", description: "六经分型、核心用药等关键词" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_consultation_record",
      description: "保存本次就诊记录（结构化病史、辨证结果）",
      parameters: {
        type: "object",
        properties: {
          consultation_id: { type: "string", description: "就诊记录ID" },
          history_json: { type: "string", description: "结构化病史JSON字符串" },
          differentiation_json: { type: "string", description: "辨证结果JSON字符串" },
        },
        required: ["consultation_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_formula_compliance",
      description: "校验处方合规性：十八反、十九畏、妊娠禁忌、药典剂量范围",
      parameters: {
        type: "object",
        properties: {
          herbs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "药名" },
                dose: { type: "number", description: "剂量(g)" },
                unit: { type: "string", description: "单位，默认g" },
              },
              required: ["name", "dose", "unit"],
            },
          },
          patient_profile: {
            type: "object",
            properties: {
              gender: { type: "string" },
              age: { type: "number" },
              pregnancy: { type: "boolean" },
              allergy_history: { type: "string" },
            },
          },
        },
        required: ["herbs"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_formula_price",
      description: "计算处方内部成本、零售价、毛利（仅医生后台显示，不进入对外处方）",
      parameters: {
        type: "object",
        properties: {
          prescription_id: { type: "string", description: "处方ID" },
        },
        required: ["prescription_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_prescription_pdf",
      description: "生成A5处方PDF（不含价格信息）",
      parameters: {
        type: "object",
        properties: {
          prescription_id: { type: "string", description: "处方ID" },
        },
        required: ["prescription_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_patient_advice",
      description: "生成患者友好医嘱（煎服指南、饮食宜忌、生活调护、复诊建议）",
      parameters: {
        type: "object",
        properties: {
          consultation_id: { type: "string", description: "就诊记录ID" },
        },
        required: ["consultation_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_risk_prediction",
      description: "生成副作用预判（医生专业版+患者友好版），结合广东地域体质特征",
      parameters: {
        type: "object",
        properties: {
          prescription_id: { type: "string", description: "处方ID" },
          patient_constitution: { type: "string", description: "患者体质" },
          formula_herbs: { type: "string", description: "处方药物组成JSON" },
        },
        required: ["prescription_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_followup_history",
      description: "复诊历史对比：对比本次与上次的症状、辨证、处方变化，提醒不良反应",
      parameters: {
        type: "object",
        properties: {
          patient_id: { type: "string", description: "患者ID" },
          current_consultation_id: { type: "string", description: "本次就诊ID" },
        },
        required: ["patient_id", "current_consultation_id"],
      },
    },
  },
];
