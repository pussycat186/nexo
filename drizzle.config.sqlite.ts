import type { Config } from "drizzle-kit";

export default {
  schema: "./shared/schema.ts",
  out: "./migrations-sqlite",
  driver: "better-sqlite",
  dbCredentials: {
    url: "./data/nexo.db"
  }
} satisfies Config;