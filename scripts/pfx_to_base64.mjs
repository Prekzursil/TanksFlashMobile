import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const OUTPUT_DIR = path.join(repoRoot, "output");
const DEFAULT_OUT = path.join(OUTPUT_DIR, "windows-cert.pfx.base64");
const ALLOWED_CERT_EXTENSIONS = new Set([".pfx", ".p12"]);

function parseArgs(argv) {
  const args = {
    inPath: null,
    outPath: DEFAULT_OUT,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--in") {
      if (!next || next.startsWith("--")) {
        throw new Error("Missing value for --in");
      }
      args.inPath = next;
      i++;
    } else if (arg === "--out") {
      if (!next || next.startsWith("--")) {
        throw new Error("Missing value for --out");
      }
      args.outPath = next;
      i++;
    } else {
      throw new Error(`Unknown arg: ${arg}`);
    }
  }

  return args;
}

function resolveInputPath(value) {
  const candidate = path.isAbsolute(value) ? path.normalize(value) : path.resolve(repoRoot, value);
  const ext = path.extname(candidate).toLowerCase();
  if (!ALLOWED_CERT_EXTENSIONS.has(ext)) {
    throw new Error(`Input must be a .pfx or .p12 file. Got: ${candidate}`);
  }
  return candidate;
}

function resolveOutputPath(value) {
  const candidate = path.isAbsolute(value) ? path.normalize(value) : path.resolve(repoRoot, value);
  const rel = path.relative(OUTPUT_DIR, candidate);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Refusing to write outside ${OUTPUT_DIR}: ${candidate}`);
  }
  if (path.extname(candidate).toLowerCase() !== ".base64") {
    throw new Error(`Output must end with .base64. Got: ${candidate}`);
  }
  return candidate;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.inPath) {
    throw new Error("Missing required arg: --in /path/to/codesign.pfx");
  }

  const inputPath = resolveInputPath(args.inPath);
  const outputPath = resolveOutputPath(args.outPath);
  if (inputPath === outputPath) {
    throw new Error("Input and output paths must be different.");
  }

  const inputStat = await fs.stat(inputPath).catch(() => null);
  if (!inputStat || !inputStat.isFile()) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const buf = await fs.readFile(inputPath);
  const base64 = buf.toString("base64");

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, base64, { encoding: "utf8", mode: 0o600 });
  console.log(`Wrote base64 to ${outputPath}`);
  console.log("Note: this file is sensitive; delete it after setting GitHub secrets.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
