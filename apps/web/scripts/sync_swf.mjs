import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..');

const sourceSwf = path.join(repoRoot, 'assets', 'original', 'tanks.swf');
const destDir = path.join(scriptDir, '..', 'public', 'original');
const destSwf = path.join(destDir, 'tanks.swf');

async function main() {
  try {
    await fs.access(sourceSwf);
  } catch {
    console.error(
      [
        'Missing source SWF.',
        `Expected: ${sourceSwf}`,
        '',
        'Place the SWF at that path, then re-run this script.',
        "If you don't want to bundle it, you can also use the in-app file picker as an alternative.",
      ].join('\n'),
    );
    process.exitCode = 1;
    return;
  }

  await fs.mkdir(destDir, { recursive: true });
  await fs.copyFile(sourceSwf, destSwf);
  console.log(`Copied SWF to: ${destSwf}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
