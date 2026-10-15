import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const local = /^(localhost|127\.0\.0\.1)$/.test(new URL(url).hostname);

const globalForDb = globalThis as unknown as {
  conn?: ReturnType<typeof postgres>;
};

const conn =
  globalForDb.conn ??
  postgres(url, {
    prepare: false,
    max: process.env.NODE_ENV === "production" ? 1 : 10,
    ssl: local ? false : "require",
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = conn;
}

export const db = drizzle(conn, { schema });
