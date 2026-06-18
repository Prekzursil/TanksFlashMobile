import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function readAppVersion(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const versionPath = path.resolve(here, '..', '..', 'VERSION');
  try {
    const raw = fs.readFileSync(versionPath, 'utf8').trim();
    return raw || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export default defineConfig(({ command }) => {
  const base = command === 'build' ? './' : '/';
  const version = readAppVersion();
  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
  };
});
