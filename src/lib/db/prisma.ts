import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbReady: boolean;
  initPromise: Promise<void> | null;
  initStarted: boolean;
};

function getDbPath(): string {
  if (process.env.VERCEL && !process.env.TURSO_DATABASE_URL) return "/tmp/dev.db";
  const url = (process.env.DATABASE_URL || "file:./dev.db").replace(/^"|"$/g, "");
  let dbPath = url.replace("file:", "");
  if (!path.isAbsolute(dbPath)) {
    dbPath = path.resolve(process.env.DATA_DIR || process.cwd(), dbPath);
  }
  return dbPath;
}

function ensureDbDir() {
  if (globalForPrisma.dbReady) return;
  // Skip for Turso — no local file to create
  if (process.env.TURSO_DATABASE_URL) {
    globalForPrisma.dbReady = true;
    return;
  }
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  globalForPrisma.dbReady = true;
}

function isTursoAvailable(): boolean {
  return !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

async function initSchema(prisma: PrismaClient) {
  const usingTurso = isTursoAvailable();

  // Check if schema exists — retry on locked database
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await prisma.$executeRaw`SELECT 1 FROM User LIMIT 1`;
      console.log("[DB] Schema already exists, running incremental migrations...");
      if (!usingTurso) {
        const newColumns = [
          `ALTER TABLE Consultation ADD COLUMN "faceImage" TEXT`,
          `ALTER TABLE Consultation ADD COLUMN "tongueAnalysis" TEXT`,
          `ALTER TABLE Consultation ADD COLUMN "faceAnalysis" TEXT`,
          `ALTER TABLE Patient ADD COLUMN "address" TEXT`,
          `ALTER TABLE Patient ADD COLUMN "createdBy" TEXT REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
        ];
        for (const sql of newColumns) {
          try { await prisma.$executeRawUnsafe(sql); } catch { /* column may exist */ }
        }
      }
      // Seed data (idempotent upserts)
      await seedData(prisma);
      return;
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || "";
      if (msg.includes("locked") && attempt < 4) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        continue;
      }
      break;
    }
  }

  // Turso: schema should already exist via prisma db push, just seed
  if (usingTurso) {
    console.log("[DB] Turso — seeding data...");
    await seedData(prisma);
    return;
  }

  // Local SQLite: create schema from migration file
  console.log("[DB] Creating schema...");
  const rootDir = process.env.DATA_DIR || process.cwd();
  const schemaPath = path.join(rootDir, "prisma/migrations/20260601043216_init/migration.sql");
  if (!fs.existsSync(schemaPath)) { console.log("[DB] No migration file at", schemaPath); return; }
  const schema = fs.readFileSync(schemaPath, "utf8");

  const stmts = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of stmts) {
    try { await prisma.$executeRawUnsafe(`${stmt};`); } catch { /* table may exist */ }
  }
  console.log("[DB] Schema created.");

  await seedData(prisma);
}

async function seedData(prisma: PrismaClient) {
  // Import herbs — always check and fill if missing
  const rootDir = process.env.DATA_DIR || process.cwd();
  const herbsPath = path.join(rootDir, "prisma/data/herbs.json");
  if (fs.existsSync(herbsPath)) {
    try {
      const herbCount = await prisma.herbReference.count();
      if (herbCount < 100) {
        const herbs = JSON.parse(fs.readFileSync(herbsPath, "utf8"));
        console.log(`[DB] Importing ${herbs.length} herbs from 中国药典...`);
        for (const h of herbs) {
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
        }
        console.log("[DB] Herbs imported.");
      } else {
        console.log(`[DB] ${herbCount} herbs already present, skip import.`);
      }
    } catch (e) { console.error("[DB] Herb import error:", e); }
  }

  // Skip user seeding if already done
  try {
    const count = await prisma.user.count();
    if (count > 0) { console.log("[DB] Users already seeded, skip."); return; }
  } catch { /* table might not exist */ }

  // Default users
  const bcrypt = await import("bcryptjs");
  const hash = (pw: string) => bcrypt.default.hashSync(pw, 10);
  const users = [
    { id: "user-admin", username: "admin", password: hash("admin123"), name: "系统管理员", role: "ADMIN", phone: "13800000000" },
    { id: "user-doctor", username: "doctor", password: hash("doctor123"), name: "张医师", role: "DOCTOR", phone: "13800000001" },
    { id: "user-assistant", username: "assistant", password: hash("assistant123"), name: "李助理", role: "ASSISTANT", phone: "13800000002" },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: u,
      update: { username: u.username, password: u.password, name: u.name, role: u.role, phone: u.phone },
    });
  }
  console.log("[DB] Users seeded.");

  // Compliance rules
  const rules = [
    { id: "ant-甘草-甘遂", type: "ANTAGONISM", herbA: "甘草", herbB: "甘遂", severity: "DANGER", desc: "甘草反甘遂 — 十八反", source: "《神农本草经》十八反" },
    { id: "ant-甘草-大戟", type: "ANTAGONISM", herbA: "甘草", herbB: "大戟", severity: "DANGER", desc: "甘草反大戟 — 十八反", source: "《神农本草经》十八反" },
    { id: "ant-甘草-芫花", type: "ANTAGONISM", herbA: "甘草", herbB: "芫花", severity: "DANGER", desc: "甘草反芫花 — 十八反", source: "《神农本草经》十八反" },
    { id: "ant-甘草-海藻", type: "ANTAGONISM", herbA: "甘草", herbB: "海藻", severity: "DANGER", desc: "甘草反海藻 — 十八反", source: "《神农本草经》十八反" },
    { id: "ant-乌头-半夏", type: "ANTAGONISM", herbA: "乌头", herbB: "半夏", severity: "DANGER", desc: "乌头反半夏 — 十八反", source: "《神农本草经》十八反" },
    { id: "ant-乌头-瓜蒌", type: "ANTAGONISM", herbA: "乌头", herbB: "瓜蒌", severity: "DANGER", desc: "乌头反瓜蒌 — 十八反", source: "《神农本草经》十八反" },
    { id: "ant-乌头-贝母", type: "ANTAGONISM", herbA: "乌头", herbB: "贝母", severity: "DANGER", desc: "乌头反贝母 — 十八反", source: "《神农本草经》十八反" },
    { id: "ant-乌头-白蔹", type: "ANTAGONISM", herbA: "乌头", herbB: "白蔹", severity: "DANGER", desc: "乌头反白蔹 — 十八反", source: "《神农本草经》十八反" },
    { id: "ant-乌头-白及", type: "ANTAGONISM", herbA: "乌头", herbB: "白及", severity: "DANGER", desc: "乌头反白及 — 十八反", source: "《神农本草经》十八反" },
    { id: "ant-藜芦-人参", type: "ANTAGONISM", herbA: "藜芦", herbB: "人参", severity: "DANGER", desc: "藜芦反人参 — 十八反", source: "《神农本草经》十八反" },
    { id: "ant-藜芦-细辛", type: "ANTAGONISM", herbA: "藜芦", herbB: "细辛", severity: "DANGER", desc: "藜芦反细辛 — 十八反", source: "《神农本草经》十八反" },
    { id: "ant-藜芦-芍药", type: "ANTAGONISM", herbA: "藜芦", herbB: "芍药", severity: "DANGER", desc: "藜芦反芍药 — 十八反", source: "《神农本草经》十八反" },
    { id: "fear-丁香-郁金", type: "FEAR", herbA: "丁香", herbB: "郁金", severity: "WARNING", desc: "丁香畏郁金 — 十九畏", source: "《神农本草经》十九畏" },
    { id: "fear-人参-五灵脂", type: "FEAR", herbA: "人参", herbB: "五灵脂", severity: "WARNING", desc: "人参畏五灵脂 — 十九畏", source: "《神农本草经》十九畏" },
    { id: "preg-巴豆", type: "PREGNANCY", herbA: "巴豆", severity: "BLOCK", desc: "妊娠禁用药，大毒峻下", source: "《中国药典》妊娠禁忌" },
    { id: "preg-大戟", type: "PREGNANCY", herbA: "大戟", severity: "BLOCK", desc: "妊娠禁用药，峻下逐水", source: "《中国药典》妊娠禁忌" },
    { id: "preg-芫花", type: "PREGNANCY", herbA: "芫花", severity: "BLOCK", desc: "妊娠禁用药，峻下逐水", source: "《中国药典》妊娠禁忌" },
    { id: "preg-甘遂", type: "PREGNANCY", herbA: "甘遂", severity: "BLOCK", desc: "妊娠禁用药，峻下逐水", source: "《中国药典》妊娠禁忌" },
    { id: "preg-麝香", type: "PREGNANCY", herbA: "麝香", severity: "BLOCK", desc: "妊娠禁用药，开窍走窜", source: "《中国药典》妊娠禁忌" },
    { id: "preg-附子", type: "PREGNANCY", herbA: "附子", severity: "DANGER", desc: "妊娠慎用药，大热有毒", source: "《中国药典》妊娠禁忌" },
    { id: "preg-大黄", type: "PREGNANCY", herbA: "大黄", severity: "DANGER", desc: "妊娠慎用药，攻下力强", source: "《中国药典》妊娠禁忌" },
    { id: "preg-桃仁", type: "PREGNANCY", herbA: "桃仁", severity: "DANGER", desc: "妊娠慎用药，活血化瘀", source: "《中国药典》妊娠禁忌" },
    { id: "preg-红花", type: "PREGNANCY", herbA: "红花", severity: "DANGER", desc: "妊娠慎用药，活血化瘀", source: "《中国药典》妊娠禁忌" },
  ];
  for (const r of rules) {
    await prisma.complianceRule.upsert({
      where: { id: r.id },
      update: {},
      create: { id: r.id, ruleType: r.type, herbA: r.herbA, herbB: r.herbB || null, severity: r.severity, description: r.desc, sourceNote: r.source },
    });
  }
  console.log("[DB] Compliance rules seeded.");

  // Seed herb prices
  const pricesPath = path.join(rootDir, "prisma/data/herb-prices.json");
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
        }).catch(() => { /* skip if duplicate */ });
        seeded++;
      }
    }
    console.log(`[DB] ${seeded} herb prices seeded.`);
  }
}

ensureDbDir();

function createPrismaClient(): PrismaClient {
  if (isTursoAvailable()) {
    console.log("[DB] Using Turso (libsql) adapter");
    const adapter = new PrismaLibSql({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }

  // Local SQLite
  return new PrismaClient();
}

const _prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = _prisma;

function triggerInit() {
  if (!globalForPrisma.initPromise && process.env.DATABASE_URL) {
    if (globalForPrisma.initStarted) {
      return globalForPrisma.initPromise;
    }
    globalForPrisma.initStarted = true;
    ensureDbDir();
    globalForPrisma.initPromise = initSchema(_prisma)
      .catch((e) => console.error("[DB] Init error:", e))
      .finally(() => { globalForPrisma.initStarted = false; });
  }
  return globalForPrisma.initPromise;
}

function createLazyProxy<T extends object>(target: T): T {
  return new Proxy(target, {
    get(t, prop: string | symbol) {
      if (typeof prop === "string" && (prop === "$on" || prop === "$connect" || prop === "$disconnect" || prop === "$use" || prop === "then" || prop[0] === "$")) {
        return (t as Record<string | symbol, unknown>)[prop];
      }

      const val = (t as Record<string | symbol, unknown>)[prop];

      if (typeof val === "function") {
        return (...args: unknown[]) => {
          const init = triggerInit();
          if (init) {
            return init.then(() => (val as (...a: unknown[]) => unknown).apply(t, args));
          }
          return (val as (...a: unknown[]) => unknown).apply(t, args);
        };
      }

      if (val !== null && typeof val === "object") {
        return createLazyProxy(val as object);
      }

      return val;
    },
  }) as T;
}

export const prisma = createLazyProxy(_prisma);
