import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";
import { consultationAccessWhere } from "@/lib/auth/access";
import { callDeepSeekJson } from "@/lib/ai/client";
import { SYSTEM_RULES } from "@/lib/ai/prompts";
import { z } from "zod";

const TemplatesSchema = z.object({
  templates: z.array(z.object({
    decoctionMethod: z.string(),
    usageInstruction: z.string(),
    precautions: z.string(),
    rationale: z.string(),
  })),
});

function parseHerbs(value: string | null | undefined): Array<{ name: string; dose: number }> {
  if (!value) return [];
  try {
    const herbs = JSON.parse(value);
    return Array.isArray(herbs) ? herbs : [];
  } catch {
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = await params;

  const consultation = await prisma.consultation.findFirst({
    where: consultationAccessWhere(session, id),
    include: {
      patient: true,
      prescriptions: { orderBy: { version: "desc" }, take: 1 },
    },
  });

  if (!consultation) {
    return NextResponse.json({ error: "就诊记录不存在" }, { status: 404 });
  }

  const prescription = consultation.prescriptions[0];
  const herbs: Array<{ name: string; dose: number }> = prescription
    ? parseHerbs(prescription.herbs)
    : [];

  // Fetch historical decoction/usage (unique, from past prescriptions)
  const allPrescriptions = await prisma.prescription.findMany({
    where: {
      consultation: session.role === "ADMIN" ? {} : { doctorId: session.userId },
      decoctionMethod: { not: null },
    },
    select: { decoctionMethod: true, usageInstruction: true, precautions: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const seenDecoctions = new Set<string>();
  const history: Array<{ decoctionMethod: string; usageInstruction: string; precautions: string }> = [];

  for (const p of allPrescriptions) {
    const dm = p.decoctionMethod?.trim();
    if (dm && !seenDecoctions.has(dm)) {
      seenDecoctions.add(dm);
      history.push({ decoctionMethod: dm, usageInstruction: p.usageInstruction?.trim() || "", precautions: p.precautions?.trim() || "" });
      if (history.length >= 20) break;
    }
  }

  // AI recommendations: 6 templates
  let aiTemplates: Array<{ decoctionMethod: string; usageInstruction: string; precautions: string; rationale: string }> = [];
  if (herbs.length > 0) {
    try {
      const herbList = herbs.map((h) => `${h.name}${h.dose}g`).join("、");
      const aiInput = [
        `方名：${prescription?.formulaName || "未命名"}`,
        `药物：${herbList}`,
        `剂数：${prescription?.totalDoses || 7}剂`,
        consultation.chiefComplaint ? `主诉：${consultation.chiefComplaint}` : "",
      ].filter(Boolean).join("\n");

      const result = await callDeepSeekJson({
        systemPrompt: `${SYSTEM_RULES}
你是中药煎服方法专家。请根据处方的药物组成和患者情况，推荐6条合适的煎服方法、用法用量、注意事项组合。

规则：
1. 6条推荐覆盖不同角度：常规煎法、精简化版、先煎后下版、滋补慢煎版、解表快煎版、特殊用法版
2. decoctionMethod 侧重煎煮步骤（如"每日1剂，冷水浸泡30分钟，武火煮沸后文火煎煮30分钟，取汁300ml"）
3. usageInstruction 侧重服用方法（如"分早晚2次温服，饭后30分钟服用"）
4. precautions 侧重用药注意事项（如"忌生冷油腻辛辣；若出现皮疹或腹泻立即停用并联系医师"）
5. rationale 用15字内简要说明推荐理由
6. 确保每条推荐都是完整可用的

输出 JSON：
{
  "templates": [
    { "decoctionMethod": "...", "usageInstruction": "...", "precautions": "...", "rationale": "..." },
    ...共6条
  ]
}`,
        userMessage: aiInput,
        schema: TemplatesSchema,
        schemaName: "decoction-templates",
        temperature: 0.4,
        maxTokens: 2048,
      });
      aiTemplates = result?.templates || [];
    } catch {
      // Non-critical — proceed without AI templates
    }
  }

  return NextResponse.json({ ai: aiTemplates, history });
}
