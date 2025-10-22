import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const databaseUrl = `postgresql://${process.env.POSTGRES_USERNAME}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;
export const db = drizzle(databaseUrl);

// Apply SQL migrations on startup (idempotent) with simple retry to handle container startup order
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
const maxRetries = Number(process.env.MIGRATION_RETRIES || 20);
const backoffMs = Number(process.env.MIGRATION_BACKOFF_MS || 2000);

for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log(`✓ Drizzle migrations applied (attempt ${attempt})`);
    break;
  } catch (err: any) {
    const isConnRefused =
      err?.code === "ECONNREFUSED" ||
      /ECONNREFUSED/i.test(String(err?.message));
    if (attempt === maxRetries || !isConnRefused) {
      console.error("✗ Failed to apply migrations:", err);
      throw err;
    }
    console.warn(
      `Postgres not ready yet (attempt ${attempt}/${maxRetries}). Retrying in ${backoffMs}ms...`
    );
    await sleep(backoffMs);
  }
}
