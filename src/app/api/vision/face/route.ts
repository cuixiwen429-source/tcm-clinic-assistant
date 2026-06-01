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

    if (!file) return NextResponse.json({ error: "未上传面相图片" }, { status: 400 });

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

    const prompt = `你是一位资深中医面诊专家，请严格按照中医面诊标准对这张面部照片进行专业分析。${patientCtx}

请从以下维度逐一观察并分析：

一、面色（五色诊）
1. 整体面色：青色/赤色/黄色/白色/黑色/正常红黄隐隐 —— 选择最符合的一种
2. 面色分布：全脸色变/额部/两颧/鼻部/下颌/眼眶周围 —— 描述颜色分布的具体部位
3. 面色光泽：鲜明润泽（有神）/晦暗枯槁（无神）/尚有光泽（有华）/光泽不足（少华）
4. 面色浮沉：浮（病在表）/沉（病在里）/不浮不沉

二、面部形态
1. 面部整体：正常/浮肿/消瘦/萎黄/黧黑/恍白
2. 眼部特征：正常/眼睑浮肿/目窠凹陷/目赤/目黄/眼眶暗黑/眼袋明显
3. 口唇特征：正常/唇色淡白/唇色红赤/唇色紫暗/唇色青黑/口唇干裂/口唇润泽
4. 鼻部特征：正常/鼻头色红/鼻头色青/鼻头色黄/鼻头色白/鼻翼煽动
5. 其他特征：皮肤斑疹/痤疮/色素沉着/蜘蛛痣/黄疸/紫癜/皮肤干燥/皮肤油腻

三、五脏面部对应分析（《灵枢·五色》）
1. 额头（心/咽喉对应区）：正常/异常 —— 描述
2. 鼻部及两侧（脾/胃对应区）：正常/异常 —— 描述
3. 两颧（肺对应区）：正常/异常 —— 描述
4. 两颊及颞部（肝/胆对应区）：正常/异常 —— 描述
5. 下颌及颏部（肾/膀胱对应区）：正常/异常 —— 描述

四、综合辨证分析
1. 面诊总体印象（一句话概括）
2. 主色与客色判断：主色（先天之色）/客色（后天变化）/病色（病态之色）
3. 寒热辨证：寒证/热证/寒热错杂
4. 虚实辨证：虚证/实证/虚实夹杂
5. 病位判断：关联脏腑及经络（心/肝/脾/肺/肾/胃/大肠/小肠/膀胱/胆）
6. 气血津液判断：气滞/气虚/血瘀/血虚/痰湿/水饮/津亏/湿热/血热/血寒
7. 脏腑辨证推断：哪个（些）脏腑功能失调
8. 可能的证型推断（2-3个可能的证型，按可能性排序）

五、临床意义
1. 面象反映的主要病理变化
2. 鉴别诊断要点
3. 与常见面部表征的鉴别
4. 治疗原则建议
5. 预后判断

请以以下JSON格式返回（严格保持字段结构）：
{
  "facial_color": {
    "overall_color": "",
    "distribution": "",
    "luster": "",
    "depth": ""
  },
  "facial_morphology": {
    "overall": "",
    "eyes": "",
    "lips": "",
    "nose": "",
    "other_features": []
  },
  "five_organ_face": {
    "forehead_heart": "",
    "nose_spleen": "",
    "cheeks_lung": "",
    "temples_liver": "",
    "chin_kidney": ""
  },
  "syndrome_analysis": {
    "overall_impression": "",
    "primary_secondary_color": "",
    "cold_heat": "",
    "deficiency_excess": "",
    "disease_location": "",
    "organs_involved": [],
    "qi_blood_fluid": [],
    "zangfu_differentiation": "",
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
    const msg = err instanceof Error ? err.message : "面相分析失败";
    console.error("[FaceVision]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
