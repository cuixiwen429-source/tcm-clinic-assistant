import { PrismaClient } from "@prisma/client";
import herbs from "./data/herbs.json";

const prisma = new PrismaClient();

async function main() {
  console.log(`开始导入 ${herbs.length} 味药材...`);

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < herbs.length; i++) {
    const h = herbs[i];
    try {
      await prisma.herbReference.upsert({
        where: { name: h.name },
        create: {
          name: h.name,
          pinyin: h.pinyin || null,
          category: h.category || null,
          nature: h.nature || null,
          taste: h.taste || null,
          meridian: h.meridian || null,
          pharmacopoeiaMin: h.pharmacopoeiaMin ?? null,
          pharmacopoeiaMax: h.pharmacopoeiaMax ?? null,
          toxicity: h.toxicity || null,
        },
        update: {
          pinyin: h.pinyin || null,
          category: h.category || null,
          nature: h.nature || null,
          taste: h.taste || null,
          meridian: h.meridian || null,
          pharmacopoeiaMin: h.pharmacopoeiaMin ?? null,
          pharmacopoeiaMax: h.pharmacopoeiaMax ?? null,
          toxicity: h.toxicity || null,
        },
      });
      created++;
    } catch {
      skipped++;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  进度: ${i + 1}/${herbs.length}`);
    }
  }

  console.log(`导入完成: 成功 ${created} 条, 跳过 ${skipped} 条`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
