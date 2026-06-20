import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { readFromBufferP, extractImages, extractSounds } = require('swf-extract');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const DEFAULT_SWF = path.join(repoRoot, 'assets', 'original', 'tanks.swf');
const DEFAULT_OUT = path.join(repoRoot, 'output', 'original-extracted');
const DEFAULT_GODOT_OUT = path.join(repoRoot, 'apps', 'remake-godot', 'assets', 'original');
const DEFAULT_WEB_OUT = path.join(repoRoot, 'apps', 'remake-web', 'public', 'original');

function parseArgs(argv) {
  const args = {
    swf: DEFAULT_SWF,
    out: null,
    writeGodot: false,
    writeWeb: false,
    force: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--swf' && next) {
      args.swf = path.isAbsolute(next) ? next : path.resolve(repoRoot, next);
      i++;
    } else if (arg === '--out' && next) {
      args.out = path.isAbsolute(next) ? next : path.resolve(repoRoot, next);
      i++;
    } else if (arg === '--write-godot') {
      args.writeGodot = true;
    } else if (arg === '--write-web') {
      args.writeWeb = true;
    } else if (arg === '--force') {
      args.force = true;
    }
  }

  if (!args.out && !args.writeGodot && !args.writeWeb) {
    args.out = DEFAULT_OUT;
  }

  return args;
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureEmptyDir(dir, { force }) {
  const exists = await fileExists(dir);
  if (exists && !force) {
    const entries = await fs.readdir(dir).catch(() => []);
    if (entries.length > 0) {
      throw new Error(
        `Refusing to overwrite non-empty directory: ${dir}\nRe-run with --force to overwrite.`,
      );
    }
  }
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

async function writeAssetsToDir(destDir, { images, sounds, force }) {
  await ensureEmptyDir(destDir, { force });
  const imagesDir = path.join(destDir, 'images');
  const soundsDir = path.join(destDir, 'sounds');
  await fs.mkdir(imagesDir, { recursive: true });
  await fs.mkdir(soundsDir, { recursive: true });

  for (const img of images) {
    const pngData = await toPngBuffer(img.imgData, img.imgType);
    const filename = `char_${img.characterId}.png`;
    await fs.writeFile(path.join(imagesDir, filename), pngData);
  }

  for (const s of sounds) {
    const filename = `sound_${s.soundId}.${s.type}`;
    await fs.writeFile(path.join(soundsDir, filename), s.mp3Data);
  }

  const manifest = {
    swf: path.relative(repoRoot, DEFAULT_SWF),
    images: images.map((i) => ({
      characterId: i.characterId,
      type: 'png',
      sourceType: i.imgType,
      file: `images/char_${i.characterId}.png`,
      bytes: i.imgData.length,
    })),
    sounds: sounds.map((s) => ({
      soundId: s.soundId,
      type: s.type,
      file: `sounds/sound_${s.soundId}.${s.type}`,
      bytes: s.mp3Data.length,
    })),
  };

  await fs.writeFile(path.join(destDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

async function toPngBuffer(imgData, imgType) {
  if (imgType === 'png') return imgData;

  if (imgType === 'jpeg' || imgType === 'jpg') {
    return await convertWithPythonPillow(imgData);
  }

  throw new Error(`Unsupported SWF image type for PNG normalization: ${imgType}`);
}

async function convertWithPythonPillow(inputBuffer) {
  return await new Promise((resolve, reject) => {
    const py = spawn('python3', [
      '-c',
      [
        'import io, sys',
        'from PIL import Image',
        'img = Image.open(sys.stdin.buffer)',
        'out = io.BytesIO()',
        "img.save(out, format='PNG')",
        'sys.stdout.buffer.write(out.getvalue())',
      ].join('; '),
    ]);

    const stdout = [];
    const stderr = [];
    py.stdout.on('data', (chunk) => stdout.push(chunk));
    py.stderr.on('data', (chunk) => stderr.push(chunk));
    py.on('error', (err) => reject(err));
    py.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(`python3 image conversion failed: ${Buffer.concat(stderr).toString('utf8')}`),
        );
        return;
      }
      resolve(Buffer.concat(stdout));
    });

    py.stdin.end(inputBuffer);
  });
}

async function main() {
  const args = parseArgs(process.argv);

  if (!(await fileExists(args.swf))) {
    throw new Error(`SWF not found: ${args.swf}`);
  }

  const raw = await fs.readFile(args.swf);
  const swf = await readFromBufferP(raw);
  const images = (await Promise.all(extractImages(swf.tags))).filter(Boolean);
  const sounds = (await Promise.all(extractSounds(swf.tags))).filter(Boolean);

  const targets = [];
  if (args.out) targets.push(args.out);
  if (args.writeGodot) targets.push(DEFAULT_GODOT_OUT);
  if (args.writeWeb) targets.push(DEFAULT_WEB_OUT);

  if (targets.length === 0) {
    throw new Error('No output targets selected. Pass --out and/or --write-godot/--write-web.');
  }

  console.log('Extracting SWF assets…');
  console.log(`- SWF: ${path.relative(repoRoot, args.swf)}`);
  console.log(`- Images: ${images.length}`);
  console.log(`- Sounds: ${sounds.length}`);

  for (const destDir of targets) {
    console.log(`Writing: ${path.relative(repoRoot, destDir)}`);
    await writeAssetsToDir(destDir, { images, sounds, force: args.force });
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
