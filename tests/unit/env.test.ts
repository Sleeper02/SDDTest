import { describe, it, expect } from 'vitest';
import { parseEnv } from '@/config/env';

describe('Environment Configuration Validation (env.ts)', () => {
  it('uses defaults when environment variables are omitted', () => {
    const parsed = parseEnv({});
    expect(parsed.DATABASE_URL).toBe('./data/rss-reader.sqlite');
    expect(parsed.FEED_FETCH_TIMEOUT_MS).toBe(10000);
  });

  it('accepts custom DATABASE_URL and positive integer FEED_FETCH_TIMEOUT_MS', () => {
    const parsed = parseEnv({
      DATABASE_URL: ':memory:',
      FEED_FETCH_TIMEOUT_MS: '5000',
    });
    expect(parsed.DATABASE_URL).toBe(':memory:');
    expect(parsed.FEED_FETCH_TIMEOUT_MS).toBe(5000);
  });

  it('throws validation error on negative or non-numeric FEED_FETCH_TIMEOUT_MS', () => {
    expect(() =>
      parseEnv({
        FEED_FETCH_TIMEOUT_MS: '-100',
      })
    ).toThrow();

    expect(() =>
      parseEnv({
        FEED_FETCH_TIMEOUT_MS: 'invalid',
      })
    ).toThrow();
  });
});
