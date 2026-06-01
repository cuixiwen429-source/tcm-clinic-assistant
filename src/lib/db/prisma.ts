import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbReady: boolean;
};

function getDbPath(): string {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  return url.replace("file:", "");
}

function ensureDbFile() {
  if (globalForPrisma.dbReady) return;
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, "");
  }
  globalForPrisma.dbReady = true;
}

async function initSchema(prisma: PrismaClient) {
  try {
    await prisma.$executeRaw`SELECT 1 FROM User LIMIT 1`;
    // Run incremental migrations for existing databases
    const newColumns: Record<string, string> = {
      faceImage: "TEXT",
      tongueAnalysis: "TEXT",
      faceAnalysis: "TEXT",
    };
    for (const [col, type] of Object.entries(newColumns)) {
      try {
        // Check if column already exists
        const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
          `PRAGMA table_info(Consultation)`
        );
        if (!rows.some((r) => r.name === col)) {
          await prisma.$executeRawUnsafe(`ALTER TABLE Consultation ADD COLUMN "${col}" ${type}`);
          console.log(`[DB] Added column: ${col}`);
        }
      } catch (e) { console.error(`[DB] Migration error for ${col}:`, e); }
    }
    return;
  } catch {
    console.log("[DB] Creating schema...");
  }

  const schemaPath = path.resolve(process.cwd(), "prisma/migrations/20260601043216_init/migration.sql");
  if (!fs.existsSync(schemaPath)) { console.log("[DB] No migration file"); return; }
  const schema = fs.readFileSync(schemaPath, "utf8");
  const stmts = schema.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
  for (const stmt of stmts) {
    try { await prisma.$executeRawUnsafe(`${stmt};`); } catch { /* ok */ }
  }
  console.log("[DB] Schema created.");

  // Import herbs
  const herbsPath = path.resolve(process.cwd(), "prisma/data/herbs.json");
  if (fs.existsSync(herbsPath)) {
    const herbs = JSON.parse(fs.readFileSync(herbsPath, "utf8"));
    console.log(`[DB] Importing ${herbs.length} herbs...`);
    for (const h of herbs) {
      await prisma.herbReference.upsert({
        where: { name: h.name },
        create: {
          name: h.name, pinyin: h.pinyin || null, category: h.category || null,
          nature: h.nature || null, taste: h.taste || null, meridian: h.meridian || null,
          pharmacopoeiaMin: h.pharmacopoeiaMin ?? null, pharmacopoeiaMax: h.pharmacopoeiaMax ?? null,
          toxicity: h.toxicity || null,
        },
        update: {},
      });
    }
    console.log("[DB] Herbs imported.");
  }

  // Default users
  const bcrypt = await import("bcryptjs");
  const hash = (pw: string) => bcrypt.default.hashSync(pw, 10);
  const users = [
    { username: "admin", password: hash("admin123"), name: "系统管理员", role: "ADMIN", phone: "13800000000" },
    { username: "doctor", password: hash("doctor123"), name: "张医师", role: "DOCTOR", phone: "13800000001" },
    { username: "assistant", password: hash("assistant123"), name: "李助理", role: "ASSISTANT", phone: "13800000002" },
  ];
  for (const u of users) {
    await prisma.user.upsert({ where: { username: u.username }, update: {}, create: u });
  }
  console.log("[DB] Users created.");

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
}

ensureDbFile();

const _prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = _prisma;

// Lazy init: only on first actual query (skipped during next build data collection)
let _initPromise: Promise<void> | null = null;
function triggerInit() {
  if (!_initPromise && process.env.DATABASE_URL) {
    ensureDbFile();
    _initPromise = initSchema(_prisma).catch((e) => console.error("[DB] Init error:", e));
  }
  return _initPromise;
}

// Recursive lazy proxy — ensures init completes before any query
function createLazyProxy<T extends object>(target: T): T {
  return new Proxy(target, {
    get(t, prop: string | symbol) {
      // Skip special/internal props
      if (typeof prop === "string" && (prop === "$on" || prop === "$connect" || prop === "$disconnect" || prop === "$use" || prop === "then")) {
        return (t as Record<string | symbol, unknown>)[prop];
      }

      const val = (t as Record<string | symbol, unknown>)[prop];

      // Wrap functions to await init first
      if (typeof val === "function") {
        return (...args: unknown[]) => {
          const init = triggerInit();
          if (init) {
            return init.then(() => (val as (...a: unknown[]) => unknown).apply(t, args));
          }
          return (val as (...a: unknown[]) => unknown).apply(t, args);
        };
      }

      // Wrap nested objects (model delegates) recursively
      if (val !== null && typeof val === "object") {
        return createLazyProxy(val as object);
      }

      return val;
    },
  }) as T;
}

export const prisma = createLazyProxy(_prisma);