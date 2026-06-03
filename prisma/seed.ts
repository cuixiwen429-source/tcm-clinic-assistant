import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create default users
  const adminPassword = await bcrypt.hash("admin123", 10);
  const doctorPassword = await bcrypt.hash("doctor123", 10);
  const assistantPassword = await bcrypt.hash("assistant123", 10);

  const admin = await prisma.user.upsert({
    where: { id: "user-admin" },
    update: { username: "admin", password: adminPassword, name: "系统管理员", role: "ADMIN", phone: "13800000000" },
    create: {
      id: "user-admin",
      username: "admin",
      password: adminPassword,
      name: "系统管理员",
      role: "ADMIN",
      phone: "13800000000",
    },
  });
  console.log("Created admin user:", admin.username);

  const doctor = await prisma.user.upsert({
    where: { id: "user-doctor" },
    update: { username: "doctor", password: doctorPassword, name: "张医师", role: "DOCTOR", phone: "13800000001" },
    create: {
      id: "user-doctor",
      username: "doctor",
      password: doctorPassword,
      name: "张医师",
      role: "DOCTOR",
      phone: "13800000001",
    },
  });
  console.log("Created doctor user:", doctor.username);

  const assistant = await prisma.user.upsert({
    where: { id: "user-assistant" },
    update: { username: "assistant", password: assistantPassword, name: "李助理", role: "ASSISTANT", phone: "13800000002" },
    create: {
      id: "user-assistant",
      username: "assistant",
      password: assistantPassword,
      name: "李助理",
      role: "ASSISTANT",
      phone: "13800000002",
    },
  });
  console.log("Created assistant user:", assistant.username);

  // Seed 十八反 (18 Antagonisms) compliance rules
  const antagonisms = [
    { herbA: "甘草", herbB: "甘遂", desc: "甘草反甘遂 — 十八反" },
    { herbA: "甘草", herbB: "大戟", desc: "甘草反大戟 — 十八反" },
    { herbA: "甘草", herbB: "芫花", desc: "甘草反芫花 — 十八反" },
    { herbA: "甘草", herbB: "海藻", desc: "甘草反海藻 — 十八反" },
    { herbA: "乌头", herbB: "半夏", desc: "乌头反半夏 — 十八反" },
    { herbA: "乌头", herbB: "瓜蒌", desc: "乌头反瓜蒌 — 十八反" },
    { herbA: "乌头", herbB: "贝母", desc: "乌头反贝母 — 十八反" },
    { herbA: "乌头", herbB: "白蔹", desc: "乌头反白蔹 — 十八反" },
    { herbA: "乌头", herbB: "白及", desc: "乌头反白及 — 十八反" },
    { herbA: "附子", herbB: "半夏", desc: "附子反半夏 — 十八反（乌头类）" },
    { herbA: "附子", herbB: "瓜蒌", desc: "附子反瓜蒌 — 十八反（乌头类）" },
    { herbA: "附子", herbB: "贝母", desc: "附子反贝母 — 十八反（乌头类）" },
    { herbA: "附子", herbB: "白蔹", desc: "附子反白蔹 — 十八反（乌头类）" },
    { herbA: "附子", herbB: "白及", desc: "附子反白及 — 十八反（乌头类）" },
    { herbA: "藜芦", herbB: "人参", desc: "藜芦反人参 — 十八反" },
    { herbA: "藜芦", herbB: "沙参", desc: "藜芦反沙参 — 十八反" },
    { herbA: "藜芦", herbB: "丹参", desc: "藜芦反丹参 — 十八反" },
    { herbA: "藜芦", herbB: "玄参", desc: "藜芦反玄参 — 十八反" },
    { herbA: "藜芦", herbB: "苦参", desc: "藜芦反苦参 — 十八反" },
    { herbA: "藜芦", herbB: "细辛", desc: "藜芦反细辛 — 十八反" },
    { herbA: "藜芦", herbB: "芍药", desc: "藜芦反芍药 — 十八反" },
  ];

  for (const a of antagonisms) {
    await prisma.complianceRule.upsert({
      where: { id: `antagonism-${a.herbA}-${a.herbB}` },
      update: {},
      create: {
        id: `antagonism-${a.herbA}-${a.herbB}`,
        ruleType: "ANTAGONISM",
        herbA: a.herbA,
        herbB: a.herbB,
        severity: "DANGER",
        description: a.desc,
        sourceNote: "《神农本草经》十八反",
      },
    });
  }
  console.log(`Seeded ${antagonisms.length} antagonism rules`);

  // Seed 十九畏 (19 Fears) compliance rules
  const fears = [
    { herbA: "硫黄", herbB: "朴硝", desc: "硫黄畏朴硝 — 十九畏" },
    { herbA: "水银", herbB: "砒霜", desc: "水银畏砒霜 — 十九畏" },
    { herbA: "狼毒", herbB: "密陀僧", desc: "狼毒畏密陀僧 — 十九畏" },
    { herbA: "巴豆", herbB: "牵牛", desc: "巴豆畏牵牛 — 十九畏" },
    { herbA: "丁香", herbB: "郁金", desc: "丁香畏郁金 — 十九畏" },
    { herbA: "牙硝", herbB: "三棱", desc: "牙硝畏三棱 — 十九畏" },
    { herbA: "川乌", herbB: "犀角", desc: "川乌畏犀角 — 十九畏" },
    { herbA: "草乌", herbB: "犀角", desc: "草乌畏犀角 — 十九畏" },
    { herbA: "人参", herbB: "五灵脂", desc: "人参畏五灵脂 — 十九畏" },
    { herbA: "官桂", herbB: "赤石脂", desc: "官桂畏赤石脂 — 十九畏" },
    { herbA: "肉桂", herbB: "赤石脂", desc: "肉桂畏赤石脂 — 十九畏" },
  ];

  for (const f of fears) {
    await prisma.complianceRule.upsert({
      where: { id: `fear-${f.herbA}-${f.herbB}` },
      update: {},
      create: {
        id: `fear-${f.herbA}-${f.herbB}`,
        ruleType: "FEAR",
        herbA: f.herbA,
        herbB: f.herbB,
        severity: "WARNING",
        description: f.desc,
        sourceNote: "《神农本草经》十九畏",
      },
    });
  }
  console.log(`Seeded ${fears.length} fear rules`);

  // Seed pregnancy contraindications
  const pregnancyContra = [
    { herb: "巴豆", category: "CONTRAINDICATED", desc: "巴豆 — 妊娠禁用药，大毒峻下" },
    { herb: "牵牛子", category: "CONTRAINDICATED", desc: "牵牛子 — 妊娠禁用药，峻下逐水" },
    { herb: "大戟", category: "CONTRAINDICATED", desc: "大戟 — 妊娠禁用药，峻下逐水" },
    { herb: "芫花", category: "CONTRAINDICATED", desc: "芫花 — 妊娠禁用药，峻下逐水" },
    { herb: "甘遂", category: "CONTRAINDICATED", desc: "甘遂 — 妊娠禁用药，峻下逐水" },
    { herb: "商陆", category: "CONTRAINDICATED", desc: "商陆 — 妊娠禁用药，峻下逐水" },
    { herb: "麝香", category: "CONTRAINDICATED", desc: "麝香 — 妊娠禁用药，开窍走窜" },
    { herb: "水蛭", category: "CONTRAINDICATED", desc: "水蛭 — 妊娠禁用药，破血逐瘀" },
    { herb: "虻虫", category: "CONTRAINDICATED", desc: "虻虫 — 妊娠禁用药，破血逐瘀" },
    { herb: "三棱", category: "CONTRAINDICATED", desc: "三棱 — 妊娠禁用药，破血行气" },
    { herb: "莪术", category: "CONTRAINDICATED", desc: "莪术 — 妊娠禁用药，破血行气" },
    { herb: "斑蝥", category: "CONTRAINDICATED", desc: "斑蝥 — 妊娠禁用药，攻毒蚀疮" },
    { herb: "附子", category: "CAUTIOUS", desc: "附子 — 妊娠慎用药，大热有毒" },
    { herb: "大黄", category: "CAUTIOUS", desc: "大黄 — 妊娠慎用药，攻下力强" },
    { herb: "芒硝", category: "CAUTIOUS", desc: "芒硝 — 妊娠慎用药，攻下力强" },
    { herb: "桃仁", category: "CAUTIOUS", desc: "桃仁 — 妊娠慎用药，活血化瘀" },
    { herb: "红花", category: "CAUTIOUS", desc: "红花 — 妊娠慎用药，活血化瘀" },
    { herb: "枳实", category: "CAUTIOUS", desc: "枳实 — 妊娠慎用药，破气消积" },
    { herb: "肉桂", category: "CAUTIOUS", desc: "肉桂 — 妊娠慎用药，辛热动血" },
    { herb: "牛膝", category: "CAUTIOUS", desc: "牛膝 — 妊娠慎用药，活血通经" },
  ];

  for (const p of pregnancyContra) {
    await prisma.complianceRule.upsert({
      where: { id: `pregnancy-${p.herb}` },
      update: {},
      create: {
        id: `pregnancy-${p.herb}`,
        ruleType: "PREGNANCY",
        herbA: p.herb,
        category: p.category,
        severity: p.category === "CONTRAINDICATED" ? "BLOCK" : "DANGER",
        description: p.desc,
        sourceNote: "《中国药典》妊娠禁忌",
      },
    });
  }
  console.log(`Seeded ${pregnancyContra.length} pregnancy rules`);

  // Seed comprehensive herb references from 中国药典 data file
  const herbsPath = path.join(__dirname, "data/herbs.json");
  if (fs.existsSync(herbsPath)) {
    const herbsData: Array<{
      name: string; pinyin: string; category: string;
      nature: string; taste: string; meridian: string;
      pharmacopoeiaMin: number; pharmacopoeiaMax: number;
      toxicity?: string | null;
    }> = JSON.parse(fs.readFileSync(herbsPath, "utf8"));
    let herbCount = 0;
    for (const herb of herbsData) {
      await prisma.herbReference.upsert({
        where: { name: herb.name },
        update: {
          pinyin: herb.pinyin, category: herb.category,
          nature: herb.nature, taste: herb.taste, meridian: herb.meridian,
          pharmacopoeiaMin: herb.pharmacopoeiaMin, pharmacopoeiaMax: herb.pharmacopoeiaMax,
          toxicity: herb.toxicity || null,
        },
        create: {
          name: herb.name, pinyin: herb.pinyin, category: herb.category,
          nature: herb.nature, taste: herb.taste, meridian: herb.meridian,
          pharmacopoeiaMin: herb.pharmacopoeiaMin, pharmacopoeiaMax: herb.pharmacopoeiaMax,
          toxicity: herb.toxicity || null,
        },
      });
      herbCount++;
    }
    console.log(`Seeded ${herbCount} herb references from 中国药典`);
  } else {
    console.warn("Herb data file not found: prisma/data/herbs.json — skipping herb seeding");
  }

  // Seed herb prices from JSON (广东同仁堂零售参考价，元/克)
  const pricesPath = path.join(__dirname, "data/herb-prices.json");
  if (fs.existsSync(pricesPath)) {
    const herbPrices: Record<string, { retailPrice: number; spec: string; origin: string }> = JSON.parse(fs.readFileSync(pricesPath, "utf8"));
    const entries = Object.entries(herbPrices);
    let seeded = 0;
    for (const [name, data] of entries) {
      const herb = await prisma.herbReference.findUnique({ where: { name } });
      if (herb) {
        await prisma.herbPrice.upsert({
          where: { id: `price-${name}` },
          update: { retailPrice: data.retailPrice, spec: data.spec, origin: data.origin },
          create: {
            id: `price-${name}`,
            herbId: herb.id,
            retailPrice: data.retailPrice,
            wholesalePrice: Math.round(data.retailPrice * 0.65 * 100) / 100,
            spec: data.spec,
            origin: data.origin,
            unit: "g",
            sourceNote: "广东同仁堂零售参考价 2024-2025",
          },
        });
        seeded++;
      }
    }
    console.log(`Seeded ${seeded} herb prices`);
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
