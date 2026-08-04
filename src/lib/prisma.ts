import { PrismaClient } from "@prisma/client";

const RETRYABLE_DATABASE_CODES = new Set(["P1001", "P1002", "P2024"]);
const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "findRaw",
  "aggregateRaw",
]);
const RETRY_DELAYS_MS = [250, 750];

function databaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { code?: unknown; errorCode?: unknown };
  if (typeof candidate.code === "string") return candidate.code;
  if (typeof candidate.errorCode === "string") return candidate.errorCode;
  return undefined;
}

function isRetryableDatabaseError(error: unknown, readOnly: boolean): boolean {
  const code = databaseErrorCode(error);
  if (code && RETRYABLE_DATABASE_CODES.has(code)) return true;
  const message = error instanceof Error ? error.message : String(error);
  if (
    readOnly &&
    (code === "P1017" || message.includes("Server has closed the connection"))
  ) {
    return true;
  }
  return (
    message.includes("Can't reach database server") ||
    message.includes("Timed out fetching a new connection from the connection pool")
  );
}

/** Retry pre-query connection failures, plus closed connections for read-only work. */
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  options: { readOnly?: boolean } = {}
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (
        !isRetryableDatabaseError(error, options.readOnly === true) ||
        attempt >= RETRY_DELAYS_MS.length
      ) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
}

/**
 * تجهيز رابط الاتصال بشكل آمن للبيئات بلا خوادم (serverless مثل Vercel).
 * مع Supabase Pooler لازم نحدّ عدد الاتصالات لكل نسخة (connection_limit=1)
 * ونفعّل وضع pgbouncer حتى لا تُستنزف حصة الاتصالات ويتوقف الموقع.
 */
function buildDatasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    const isPooler = url.hostname.includes("pooler.supabase.com");
    // Vercel is serverless: Supabase Transaction Pooler prevents Session mode
    // from exhausting its small client quota across multiple function instances.
    if (isPooler && process.env.VERCEL === "1" && url.port === "5432") {
      url.port = "6543";
    }
    // منفذ 6543 = وضع Transaction (يتحمّل مئات العملاء) — نسمح بتوازٍ أعلى.
    // منفذ 5432 على الـ Pooler = وضع Session (سعة 15 عميلاً فقط) — اتصال واحد
    // لكل نسخة حتى لا تُستنزف الحصة ويتوقف الموقع.
    const isTransactionMode = url.port === "6543";
    if (isPooler) {
      if (!url.searchParams.has("pgbouncer")) {
        url.searchParams.set("pgbouncer", "true");
      }
      if (!url.searchParams.has("connection_limit")) {
        url.searchParams.set(
          "connection_limit",
          isTransactionMode ? "5" : "1"
        );
      }
      if (!url.searchParams.has("connect_timeout")) {
        url.searchParams.set("connect_timeout", "10");
      }
      if (!url.searchParams.has("pool_timeout")) {
        url.searchParams.set("pool_timeout", "20");
      }
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function createPrismaClient() {
  const client = new PrismaClient({
    datasourceUrl: buildDatasourceUrl(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, operation, query }) {
          return withDatabaseRetry(() => query(args), {
            readOnly: READ_OPERATIONS.has(operation),
          });
        },
      },
    },
  });
}

type AppPrismaClient = ReturnType<typeof createPrismaClient>;

// نستخدم نسخة واحدة (singleton) أثناء التطوير لتجنب اتصالات hot reload الزائدة.
const globalForPrisma = globalThis as unknown as {
  prisma: AppPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
