import { config as dotenvConfig } from 'dotenv';

// Allow `npm --prefix server run migrate -- --env ../.env.local --seed` to
// use a specific dotenv file when running migrations.
const envFlag = process.argv.indexOf('--env');
if (envFlag !== -1 && process.argv[envFlag + 1]) {
  dotenvConfig({ path: process.argv[envFlag + 1], override: true });
} else {
  dotenvConfig();
}

const { getDb } = await import('./index.js');

const { raw } = await getDb();
const result = await raw.execute("SELECT name FROM sqlite_master WHERE type='table'");
console.log('[migrate] tables:', result.rows.map(r => r.name).join(', '));

if (process.argv.includes('--seed')) {
  console.log('[migrate] seeding demo data…');
  const { seedDemoData } = await import('./seed.js');
  await seedDemoData();
  console.log('[migrate] seed done.');
}

console.log('[migrate] done.');
raw.close();
