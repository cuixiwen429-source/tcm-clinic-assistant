import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db/prisma";
import { analyzeImage } from "@/lib/vision/doubao-vision";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const apiKey = process.env.VOLCENGINE_ARK_API_KEY || process.env.VOLCENGINE_ACCESS_TOKEN;
  if (!apiKey) return NextResponse.json({ error: "火山引擎视觉API Key未配置" }, { status: 503 });

  try {
    const form = await request.formData();
    const file = form.get("image") as File | null;
    const consultationId = form.get("consultationId") as string | null;

    if (!file) return NextResponse.json({ error: "未上传舌苔图片" }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const imageBase64 = buf.toString("base64");

    // Fetch patient info for context
    let patientCtx = "";
    if (consultationId) {
      const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
        include: { patient: { select: { name: true, gender: true, age: true, constitution: true, allergies: true, chronicDisease: true } } },
      });
      if (consultation?.patient) {
        const p = consultation.patient;
        patientCtx = `\n\n【患者基本信息】姓名：${p.name || "未知"}，性别：${p.gender || "未知"}，年龄：${p.age ?? "未知"}岁，体质：${p.constitution || "未知"}，过敏史：${p.allergies || "无"}，慢性病史：${p.chronicDisease || "无"}`;
      }
    }

    const prompt = `你是一位资深中医舌诊专家，请严格按照中医舌诊标准对这张舌苔照片进行专业分析。${patientCtx}

请从以下维度逐一观察并分析：

一、舌质（舌体）
1. 舌色：淡白舌/淡红舌/红舌/绛舌/紫舌/青舌/瘀斑舌 —— 选择最符合的一种，说明依据
2. 舌形：正常/胖大舌/瘦薄舌/裂纹舌/齿痕舌/芒刺舌/舌衄/镜面舌 —— 选择符合的特征，可多选
3. 舌态：柔软灵活/强硬/痿软/歪斜/震颤/短缩 —— 判断舌的动态特征
4. 舌下络脉（如有可见）：正常/怒张/紫暗/短缩

二、舌苔
1. 苔色：白苔/黄苔/灰苔/黑苔/染苔 —— 选择最符合的一种
2. 苔质：薄苔/厚苔/腻苔/滑苔/燥苔/剥落苔/无苔/地图舌/腐苔 —— 选择符合的特征，可多选
3. 苔之厚薄分布：全舌均匀/舌中厚/舌根厚/舌边薄 —— 描述分布

三、综合辨证分析
1. 舌象综合描述（一句话概括总体舌象特征）
2. 寒热辨证：寒证/热证/寒热错杂
3. 虚实辨证：虚证/实证/虚实夹杂
4. 病位判断：在表/在里/半表半里，关联脏腑（心/肝/脾/肺/肾/胃/胆/小肠/大肠/膀胱/三焦）
5. 气血津液判断：气滞/气虚/血瘀/血虚/痰湿/水饮/津亏/湿热
6. 六经辨证（胡希恕体系）：太阳/阳明/少阳/太阴/少阴/厥阴 —— 判断病在何经
7. 八纲辨证归纳：阴阳/表里/寒热/虚实
8. 可能的证型推断（2-3个可能的证型，按可能性排序）

四、临床意义
1. 此舌象提示的主要病理变化
2. 鉴别诊断要点
3. 治疗原则建议
4. 预后判断

请以以下JSON格式返回（严格保持字段结构）：
{
  "tongue_body": {
    "color": "",
    "color_desc": "",
    "shape": [],
    "shape_desc": "",
    "mobility": "",
    "sublingual_veins": ""
  },
  "tongue_coating": {
    "color": "",
    "coating_type": [],
    "distribution": "",
    "coating_desc": ""
  },
  "syndrome_analysis": {
    "overall_description": "",
    "cold_heat": "",
    "deficiency_excess": "",
    "disease_location": "",
    "organs_involved": [],
    "qi_blood_fluid": [],
    "six_channel": "",
    "eight_principles": "",
    "likely_patterns": [],
    "pathological_significance": "",
    "differential_points": "",
    "treatment_principle": "",
    "prognosis": ""
  }
}`;

    const result = await analyzeImage({ imageBase64, prompt, maxTokens: 2048 });

    // Try to parse as JSON; if fails, return raw text
    let parsed: unknown;
    try {
      const cleaned = result.replace(/```json\s*|```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { raw_analysis: result };
    }

    return NextResponse.json({ analysis: parsed });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "舌象分析失败";
    console.error("[TongueVision]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
