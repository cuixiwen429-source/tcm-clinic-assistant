import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

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

  // Seed common herb references (abbreviated list for MVP)
  const herbs = [
    { name: "麻黄", pinyin: "ma huang", category: "解表药", nature: "温", taste: "辛、微苦", meridian: "肺、膀胱", pharmacopoeiaMin: 1.5, pharmacopoeiaMax: 10, toxicity: "有小毒" },
    { name: "桂枝", pinyin: "gui zhi", category: "解表药", nature: "温", taste: "辛、甘", meridian: "心、肺、膀胱", pharmacopoeiaMin: 3, pharmacopoeiaMax: 10 },
    { name: "柴胡", pinyin: "chai hu", category: "解表药", nature: "微寒", taste: "苦、辛", meridian: "肝、胆、肺", pharmacopoeiaMin: 3, pharmacopoeiaMax: 10 },
    { name: "葛根", pinyin: "ge gen", category: "解表药", nature: "凉", taste: "甘、辛", meridian: "脾、胃、肺", pharmacopoeiaMin: 10, pharmacopoeiaMax: 15 },
    { name: "细辛", pinyin: "xi xin", category: "解表药", nature: "温", taste: "辛", meridian: "心、肺、肾", pharmacopoeiaMin: 1, pharmacopoeiaMax: 3, toxicity: "有小毒" },
    { name: "石膏", pinyin: "shi gao", category: "清热药", nature: "大寒", taste: "甘、辛", meridian: "肺、胃", pharmacopoeiaMin: 15, pharmacopoeiaMax: 60 },
    { name: "知母", pinyin: "zhi mu", category: "清热药", nature: "寒", taste: "苦、甘", meridian: "肺、胃、肾", pharmacopoeiaMin: 6, pharmacopoeiaMax: 12 },
    { name: "黄芩", pinyin: "huang qin", category: "清热药", nature: "寒", taste: "苦", meridian: "肺、胆、脾、大肠、小肠", pharmacopoeiaMin: 3, pharmacopoeiaMax: 10 },
    { name: "黄连", pinyin: "huang lian", category: "清热药", nature: "寒", taste: "苦", meridian: "心、脾、胃、肝、胆、大肠", pharmacopoeiaMin: 2, pharmacopoeiaMax: 5 },
    { name: "黄柏", pinyin: "huang bai", category: "清热药", nature: "寒", taste: "苦", meridian: "肾、膀胱、大肠", pharmacopoeiaMin: 3, pharmacopoeiaMax: 12 },
    { name: "栀子", pinyin: "zhi zi", category: "清热药", nature: "寒", taste: "苦", meridian: "心、肺、三焦", pharmacopoeiaMin: 6, pharmacopoeiaMax: 10 },
    { name: "大黄", pinyin: "da huang", category: "泻下药", nature: "寒", taste: "苦", meridian: "脾、胃、大肠、肝、心包", pharmacopoeiaMin: 3, pharmacopoeiaMax: 15 },
    { name: "芒硝", pinyin: "mang xiao", category: "泻下药", nature: "寒", taste: "咸、苦", meridian: "胃、大肠", pharmacopoeiaMin: 6, pharmacopoeiaMax: 12 },
    { name: "附子", pinyin: "fu zi", category: "温里药", nature: "大热", taste: "辛、甘", meridian: "心、肾、脾", pharmacopoeiaMin: 3, pharmacopoeiaMax: 15, toxicity: "有毒" },
    { name: "干姜", pinyin: "gan jiang", category: "温里药", nature: "热", taste: "辛", meridian: "脾、胃、肾、心、肺", pharmacopoeiaMin: 3, pharmacopoeiaMax: 10 },
    { name: "肉桂", pinyin: "rou gui", category: "温里药", nature: "大热", taste: "辛、甘", meridian: "肾、脾、心、肝", pharmacopoeiaMin: 1, pharmacopoeiaMax: 5 },
    { name: "吴茱萸", pinyin: "wu zhu yu", category: "温里药", nature: "热", taste: "辛、苦", meridian: "肝、脾、胃、肾", pharmacopoeiaMin: 1.5, pharmacopoeiaMax: 4.5, toxicity: "有小毒" },
    { name: "茯苓", pinyin: "fu ling", category: "利水渗湿药", nature: "平", taste: "甘、淡", meridian: "心、肺、脾、肾", pharmacopoeiaMin: 10, pharmacopoeiaMax: 15 },
    { name: "泽泻", pinyin: "ze xie", category: "利水渗湿药", nature: "寒", taste: "甘、淡", meridian: "肾、膀胱", pharmacopoeiaMin: 6, pharmacopoeiaMax: 10 },
    { name: "猪苓", pinyin: "zhu ling", category: "利水渗湿药", nature: "平", taste: "甘、淡", meridian: "肾、膀胱", pharmacopoeiaMin: 6, pharmacopoeiaMax: 12 },
    { name: "白术", pinyin: "bai zhu", category: "补虚药", nature: "温", taste: "苦、甘", meridian: "脾、胃", pharmacopoeiaMin: 6, pharmacopoeiaMax: 12 },
    { name: "甘草", pinyin: "gan cao", category: "补虚药", nature: "平", taste: "甘", meridian: "心、肺、脾、胃", pharmacopoeiaMin: 1.5, pharmacopoeiaMax: 10 },
    { name: "人参", pinyin: "ren shen", category: "补虚药", nature: "微温", taste: "甘、微苦", meridian: "脾、肺、心、肾", pharmacopoeiaMin: 3, pharmacopoeiaMax: 9 },
    { name: "当归", pinyin: "dang gui", category: "补虚药", nature: "温", taste: "甘、辛", meridian: "肝、心、脾", pharmacopoeiaMin: 6, pharmacopoeiaMax: 12 },
    { name: "白芍", pinyin: "bai shao", category: "补虚药", nature: "微寒", taste: "苦、酸", meridian: "肝、脾", pharmacopoeiaMin: 6, pharmacopoeiaMax: 15 },
    { name: "黄芪", pinyin: "huang qi", category: "补虚药", nature: "微温", taste: "甘", meridian: "脾、肺", pharmacopoeiaMin: 9, pharmacopoeiaMax: 30 },
    { name: "熟地黄", pinyin: "shu di huang", category: "补虚药", nature: "微温", taste: "甘", meridian: "肝、肾", pharmacopoeiaMin: 9, pharmacopoeiaMax: 15 },
    { name: "麦冬", pinyin: "mai dong", category: "补虚药", nature: "微寒", taste: "甘、微苦", meridian: "胃、肺、心", pharmacopoeiaMin: 6, pharmacopoeiaMax: 12 },
    { name: "五味子", pinyin: "wu wei zi", category: "收涩药", nature: "温", taste: "酸、甘", meridian: "肺、心、肾", pharmacopoeiaMin: 1.5, pharmacopoeiaMax: 6 },
    { name: "半夏", pinyin: "ban xia", category: "化痰止咳平喘药", nature: "温", taste: "辛", meridian: "脾、胃、肺", pharmacopoeiaMin: 3, pharmacopoeiaMax: 9, toxicity: "有毒" },
    { name: "陈皮", pinyin: "chen pi", category: "理气药", nature: "温", taste: "辛、苦", meridian: "脾、肺", pharmacopoeiaMin: 3, pharmacopoeiaMax: 10 },
    { name: "枳实", pinyin: "zhi shi", category: "理气药", nature: "微寒", taste: "苦、辛、酸", meridian: "脾、胃", pharmacopoeiaMin: 3, pharmacopoeiaMax: 10 },
    { name: "厚朴", pinyin: "hou po", category: "化湿药", nature: "温", taste: "苦、辛", meridian: "脾、胃、肺、大肠", pharmacopoeiaMin: 3, pharmacopoeiaMax: 10 },
    { name: "生姜", pinyin: "sheng jiang", category: "解表药", nature: "微温", taste: "辛", meridian: "肺、脾、胃", pharmacopoeiaMin: 3, pharmacopoeiaMax: 10 },
    { name: "大枣", pinyin: "da zao", category: "补虚药", nature: "温", taste: "甘", meridian: "脾、胃、心", pharmacopoeiaMin: 6, pharmacopoeiaMax: 15 },
    { name: "川芎", pinyin: "chuan xiong", category: "活血化瘀药", nature: "温", taste: "辛", meridian: "肝、胆、心包", pharmacopoeiaMin: 3, pharmacopoeiaMax: 10 },
    { name: "丹参", pinyin: "dan shen", category: "活血化瘀药", nature: "微寒", taste: "苦", meridian: "心、肝", pharmacopoeiaMin: 10, pharmacopoeiaMax: 15 },
    { name: "桃仁", pinyin: "tao ren", category: "活血化瘀药", nature: "平", taste: "苦、甘", meridian: "心、肝、大肠", pharmacopoeiaMin: 5, pharmacopoeiaMax: 10, toxicity: "有小毒" },
    { name: "红花", pinyin: "hong hua", category: "活血化瘀药", nature: "温", taste: "辛", meridian: "心、肝", pharmacopoeiaMin: 3, pharmacopoeiaMax: 10 },
    { name: "牡蛎", pinyin: "mu li", category: "平肝息风药", nature: "微寒", taste: "咸", meridian: "肝、胆、肾", pharmacopoeiaMin: 9, pharmacopoeiaMax: 30 },
    { name: "龙骨", pinyin: "long gu", category: "安神药", nature: "平", taste: "甘、涩", meridian: "心、肝、肾", pharmacopoeiaMin: 15, pharmacopoeiaMax: 30 },
  ];

  for (const herb of herbs) {
    await prisma.herbReference.upsert({
      where: { name: herb.name },
      update: {},
      create: herb,
    });
  }
  console.log(`Seeded ${herbs.length} herb references`);

  // Seed common herb prices (广东市场零售参考价，元/克)
  const herbPrices: Array<{ name: string; retailPrice: number; spec: string; origin: string }> = [
    { name: "麻黄", retailPrice: 0.12, spec: "统", origin: "内蒙古" },
    { name: "桂枝", retailPrice: 0.08, spec: "统", origin: "广西" },
    { name: "柴胡", retailPrice: 0.25, spec: "统", origin: "河北" },
    { name: "葛根", retailPrice: 0.10, spec: "统", origin: "湖南" },
    { name: "细辛", retailPrice: 0.35, spec: "统", origin: "辽宁" },
    { name: "石膏", retailPrice: 0.03, spec: "统", origin: "湖北" },
    { name: "知母", retailPrice: 0.18, spec: "统", origin: "河北" },
    { name: "黄芩", retailPrice: 0.22, spec: "统", origin: "山西" },
    { name: "黄连", retailPrice: 0.80, spec: "统", origin: "四川" },
    { name: "黄柏", retailPrice: 0.20, spec: "统", origin: "四川" },
    { name: "栀子", retailPrice: 0.15, spec: "统", origin: "江西" },
    { name: "大黄", retailPrice: 0.15, spec: "统", origin: "甘肃" },
    { name: "芒硝", retailPrice: 0.05, spec: "统", origin: "四川" },
    { name: "附子", retailPrice: 0.30, spec: "统", origin: "四川" },
    { name: "干姜", retailPrice: 0.15, spec: "统", origin: "云南" },
    { name: "白芍", retailPrice: 0.18, spec: "统", origin: "安徽" },
    { name: "当归", retailPrice: 0.28, spec: "统", origin: "甘肃" },
    { name: "甘草", retailPrice: 0.12, spec: "统", origin: "内蒙古" },
    { name: "炙甘草", retailPrice: 0.15, spec: "统", origin: "内蒙古" },
    { name: "黄芪", retailPrice: 0.22, spec: "统", origin: "山西" },
    { name: "党参", retailPrice: 0.25, spec: "统", origin: "甘肃" },
    { name: "人参", retailPrice: 1.50, spec: "统", origin: "吉林" },
    { name: "白术", retailPrice: 0.20, spec: "统", origin: "浙江" },
    { name: "茯苓", retailPrice: 0.15, spec: "统", origin: "云南" },
    { name: "泽泻", retailPrice: 0.12, spec: "统", origin: "福建" },
    { name: "猪苓", retailPrice: 0.55, spec: "统", origin: "陕西" },
    { name: "山药", retailPrice: 0.15, spec: "统", origin: "河南" },
    { name: "生地", retailPrice: 0.18, spec: "统", origin: "河南" },
    { name: "熟地", retailPrice: 0.22, spec: "统", origin: "河南" },
    { name: "麦冬", retailPrice: 0.30, spec: "统", origin: "四川" },
    { name: "天冬", retailPrice: 0.35, spec: "统", origin: "贵州" },
    { name: "枸杞", retailPrice: 0.25, spec: "统", origin: "宁夏" },
    { name: "五味子", retailPrice: 0.35, spec: "统", origin: "辽宁" },
    { name: "山茱萸", retailPrice: 0.28, spec: "统", origin: "河南" },
    { name: "酸枣仁", retailPrice: 1.80, spec: "统", origin: "河北" },
    { name: "远志", retailPrice: 0.45, spec: "统", origin: "山西" },
    { name: "柏子仁", retailPrice: 0.40, spec: "统", origin: "山东" },
    { name: "龙骨", retailPrice: 0.15, spec: "统", origin: "山西" },
    { name: "牡蛎", retailPrice: 0.10, spec: "统", origin: "沿海" },
    { name: "川芎", retailPrice: 0.18, spec: "统", origin: "四川" },
    { name: "丹参", retailPrice: 0.20, spec: "统", origin: "山东" },
    { name: "桃仁", retailPrice: 0.30, spec: "统", origin: "河北" },
    { name: "红花", retailPrice: 0.50, spec: "统", origin: "新疆" },
    { name: "陈皮", retailPrice: 0.10, spec: "统", origin: "广东" },
    { name: "半夏", retailPrice: 0.35, spec: "统", origin: "四川" },
    { name: "法半夏", retailPrice: 0.40, spec: "统", origin: "四川" },
    { name: "生姜", retailPrice: 0.05, spec: "统", origin: "山东" },
    { name: "大枣", retailPrice: 0.08, spec: "统", origin: "新疆" },
    { name: "肉桂", retailPrice: 0.15, spec: "统", origin: "广西" },
  ];

  for (const hp of herbPrices) {
    const herb = await prisma.herbReference.findUnique({ where: { name: hp.name } });
    if (herb) {
      await prisma.herbPrice.upsert({
        where: { id: `price-${hp.name}` },
        update: { retailPrice: hp.retailPrice, spec: hp.spec, origin: hp.origin },
        create: {
          id: `price-${hp.name}`,
          herbId: herb.id,
          retailPrice: hp.retailPrice,
          spec: hp.spec,
          origin: hp.origin,
          unit: "g",
        },
      });
    }
  }
  console.log(`Seeded ${herbPrices.length} herb prices`);

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
