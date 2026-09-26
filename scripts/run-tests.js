import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const suite = process.argv[2];
if (!['unit', 'browser'].includes(suite)) throw new Error('Choose unit or browser');
const files = readdirSync(new URL('../tests/', import.meta.url))
  .filter((name) => name.endsWith('.test.js') && name.includes('browser') === (suite === 'browser'))
  .sort().map((name) => `tests/${name}`);
if (!files.length) throw new Error(`No ${suite} tests discovered`);
// Each browser file owns a Chrome process; keep CI resource use bounded.
const concurrency = suite === 'browser' ? ['--test-concurrency=2'] : [];
const result = spawnSync(process.execPath, ['--test', ...concurrency, ...files], { stdio: 'inherit', cwd: new URL('../', import.meta.url) });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
