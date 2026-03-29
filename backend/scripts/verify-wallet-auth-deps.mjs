#!/usr/bin/env node
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const requiredModules = ['viem', 'viem/accounts'];
const missing = requiredModules.filter((moduleName) => {
  try {
    require.resolve(moduleName);
    return false;
  } catch {
    return true;
  }
});

if (missing.length > 0) {
  console.error(
    `Missing wallet auth dependencies: ${missing.join(', ')}.\n` +
    'Run `pnpm install` (or `pnpm add viem`) in backend/ and retry `pnpm build`.'
  );
  process.exit(1);
}
