import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import { readFileSync } from 'fs';

const wranglerToml = readFileSync('./wrangler.toml', 'utf-8');

export default defineWorkersConfig({
  test: {
    globals: true,
    pool: '@cloudflare/vitest-pool-workers',
    poolOptions: {
      workers: {
        wrangler: {
          configPath: './wrangler.toml',
        },
        miniflare: {
          d1Databases: ['DB'],
          kvNamespaces: ['SESSION_KV', 'RATE_KV'],
          durableObjects: {
            COLLAB_ROOM: 'BookCollabRoom',
          },
        },
      },
    },
    include: ['src/**/*.spec.ts'],
    coverage: {
      reporter: ['text', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
    },
  },
});
