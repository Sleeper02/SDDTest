import { z } from 'zod';

export const EnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .trim()
    .min(1, 'DATABASE_URL cannot be empty')
    .default('./data/rss-reader.sqlite'),
  FEED_FETCH_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive('FEED_FETCH_TIMEOUT_MS must be a positive integer')
    .default(10000),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function parseEnv(rawEnv: Record<string, string | undefined> = process.env): AppEnv {
  return EnvSchema.parse({
    DATABASE_URL: rawEnv.DATABASE_URL || undefined,
    FEED_FETCH_TIMEOUT_MS: rawEnv.FEED_FETCH_TIMEOUT_MS || undefined,
  });
}

export const env: AppEnv = parseEnv();
