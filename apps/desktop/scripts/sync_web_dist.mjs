import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const desktopDir = path.resolve(here, '..');
const webDistDir = path.resolve(desktopDir, '..', 'web', 'dist');
const outDir = path.join(desktopDir, 'web');

async function main() {
  try {
    await fs.access(path.join(webDistDir, 'index.html'));
  } catch {
    throw new Error(
      `Missing web build at ${webDistDir}. Run \`npm --prefix apps/web run build\` first.`,
    );
  }

  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });
  await fs.cp(webDistDir, outDir, { recursive: true });

  console.log(`[sync:web] Copied ${webDistDir} -> ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
