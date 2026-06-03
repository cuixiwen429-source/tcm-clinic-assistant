import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/jwt";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const rootDir = process.env.DATA_DIR || process.cwd();
  const herbsPath = path.join(rootDir, "prisma/data/herbs.json");

  if (!fs.existsSync(herbsPath)) {
    return NextResponse.json({ error: `药材数据文件不存在: ${herbsPath}` }, { status: 500 });
  }

  try {
    const herbs = JSON.parse(fs.readFileSync(herbsPath, "utf8"));
    let imported = 0;
    let skipped = 0;

    for (const h of herbs) {
      try {
        await prisma.herbReference.upsert({
          where: { name: h.name },
          create: {
            name: h.name, pinyin: h.pinyin || null, category: h.category || null,
            nature: h.nature || null, taste: h.taste || null, meridian: h.meridian || null,
            pharmacopoeiaMin: h.pharmacopoeiaMin ?? null, pharmacopoeiaMax: h.pharmacopoeiaMax ?? null,
            toxicity: h.toxicity || null,
          },
          update: {
            pinyin: h.pinyin || null, category: h.category || null,
            nature: h.nature || null, taste: h.taste || null, meridian: h.meridian || null,
            pharmacopoeiaMin: h.pharmacopoeiaMin ?? null, pharmacopoeiaMax: h.pharmacopoeiaMax ?? null,
            toxicity: h.toxicity || null,
          },
        });
        imported++;
      } catch {
        skipped++;
      }
    }

    const total = await prisma.herbReference.count();
    return NextResponse.json({ ok: true, imported, skipped, totalInDb: total });
  } catch (e: unknown) {
    return NextResponse.json({ error: "导入失败", details: (e as Error).message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const total = await prisma.herbReference.count();
  const sample = await prisma.herbReference.findMany({ take: 5, orderBy: { name: "asc" }, select: { name: true, category: true } });

  return NextResponse.json({ totalHerbsInDb: total, sample });
}
