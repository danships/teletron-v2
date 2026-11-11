import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['apps/hub/integration/**/*.test.ts'] } });
