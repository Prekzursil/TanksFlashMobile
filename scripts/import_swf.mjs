import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const ORIGINAL_ASSETS_DIR = path.join(repoRoot, 'assets', 'original');
const DEFAULT_OUT = path.join(ORIGINAL_ASSETS_DIR, 'tanks.swf');

function parseArgs(argv) {
  const args = {
    from: null,
    out: DEFAULT_OUT,
    force: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--from') {
      if (!next || next.startsWith('--')) {
        throw new Error('Missing value for --from');
      }
      args.from = next;
      i++;
    } else if (arg === '--out') {
      if (!next || next.startsWith('--')) {
        throw new Error('Missing value for --out');
      }
      args.out = resolveOutputPath(next);
      i++;
    } else if (arg === '--force') {
      args.force = true;
    } else {
      throw new Error(`Unknown arg: ${arg}`);
    }
  }

  if (!args.from) {
    throw new Error(
      [
        'Missing required arg: --from',
        '',
        'Examples:',
        '  npm run swf:import -- --from /path/to/tanks.swf',
        '',
        'Note: --from accepts local file paths only.',
        '      --out (optional) must stay under assets/original/.',
      ].join('\n'),
    );
  }

  return args;
}

function resolveOutputPath(value) {
  const candidate = path.isAbsolute(value) ? path.normalize(value) : path.resolve(repoRoot, value);
  const rel = path.relative(ORIGINAL_ASSETS_DIR, candidate);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(
      `Refusing to write outside assets/original.\nRequested: ${candidate}\nAllowed root: ${ORIGINAL_ASSETS_DIR}`,
    );
  }
  return candidate;
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function readFirstBytes(p, count) {
  const handle = await fs.open(p, 'r');
  try {
    const buf = Buffer.alloc(count);
    const { bytesRead } = await handle.read(buf, 0, count, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

function looksLikeSwfHeader(buf) {
  if (buf.length < 3) return false;
  const sig = buf.subarray(0, 3).toString('ascii');
  return sig === 'FWS' || sig === 'CWS' || sig === 'ZWS';
}

async function main() {
  const args = parseArgs(process.argv);

  console.log('SWF import helper');
  console.log('- This repo does not commit the original SWF by default.');
  console.log('- Ensure you have rights to use the SWF you copy/download.');
  console.log('');

  if (/^https?:\/\//i.test(args.from)) {
    throw new Error(
      'Network URLs are not supported by this script. Download the SWF manually, then pass a local --from path.',
    );
  }

  const fromPath = path.isAbsolute(args.from) ? args.from : path.resolve(repoRoot, args.from);
  if (!(await fileExists(fromPath))) {
    throw new Error(`Input file not found: ${fromPath}`);
  }
  if (path.resolve(fromPath) === path.resolve(args.out)) {
    throw new Error('Input and output paths must be different.');
  }

  const outDir = path.dirname(args.out);
  await ensureDir(outDir);
  if ((await fileExists(args.out)) && !args.force) {
    throw new Error(`Output already exists: ${args.out}\nRe-run with --force to overwrite.`);
  }
  if (await fileExists(args.out)) {
    await fs.rm(args.out, { force: true });
  }

  console.log(`Copying: ${fromPath}`);
  await fs.copyFile(fromPath, args.out);

  const header = await readFirstBytes(args.out, 16);
  if (!looksLikeSwfHeader(header)) {
    await fs.rm(args.out, { force: true });
    throw new Error(
      'Imported file does not look like a SWF (expected FWS/CWS/ZWS header). Aborted.',
    );
  }

  console.log(`Saved: ${args.out}`);
  console.log('');
  console.log('Next steps:');
  console.log('- (Optional) Copy SWF into the web dev server path:');
  console.log('  cd apps/web && npm run sync:swf');
  console.log('- Start the web app:');
  console.log('  cd apps/web && npm run dev');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
