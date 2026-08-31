import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/crypto.ts',
        'src/lib/fhir-mappers.ts',
        'src/lib/ids.ts',
        'src/lib/integrations.ts',
        'src/lib/interactions.ts',
        'src/lib/pin.ts',
        'src/lib/session-token.ts',
        'src/lib/sms-commands.ts',
        'src/routes/health.ts',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
