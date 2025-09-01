import "dotenv/config";
import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(5000),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be set (>=32 chars)."),
});

const parsed = Env.safeParse(process.env);
if (!parsed.success) {
  console.error("[env] Invalid env:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const ENV = parsed.data;