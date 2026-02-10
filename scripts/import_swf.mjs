import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const DEFAULT_OUT = path.join(repoRoot, "assets", "original", "tanks.swf");

function parseArgs(argv) {
  const args = {
    from: null,
    out: DEFAULT_OUT,
    force: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--from" && next) {
      args.from = next;
      i++;
    } else if (arg === "--out" && next) {
      args.out = path.isAbsolute(next) ? next : path.resolve(repoRoot, next);
      i++;
    } else if (arg === "--force") {
      args.force = true;
    }
  }

  if (!args.from) {
    throw new Error(
      [
        "Missing required arg: --from",
        "",
        "Examples:",
        "  npm run swf:import -- --from /path/to/tanks.swf",
        "  npm run swf:import -- --from https://example.com/tanks.swf",
        "",
        "Note: You must have the right to use/distribute any SWF you download/copy.",
      ].join("\n"),
    );
  }

  return args;
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(value);
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
  const handle = await fs.open(p, "r");
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
  const sig = buf.subarray(0, 3).toString("ascii");
  return sig === "FWS" || sig === "CWS" || sig === "ZWS";
}

async function downloadToFile(url, outPath) {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Download failed: ${resp.status} ${resp.statusText}`);
  }
  const arrayBuffer = await resp.arrayBuffer();
  await fs.writeFile(outPath, new Uint8Array(arrayBuffer));
}

async function main() {
  const args = parseArgs(process.argv);

  console.log("SWF import helper");
  console.log("- This repo does not commit the original SWF by default.");
  console.log("- Ensure you have rights to use the SWF you copy/download.");
  console.log("");

  const outDir = path.dirname(args.out);
  await ensureDir(outDir);

  if ((await fileExists(args.out)) && !args.force) {
    throw new Error(
      `Output already exists: ${args.out}\nRe-run with --force to overwrite.`,
    );
  }

  if (await fileExists(args.out)) {
    await fs.rm(args.out, { force: true });
  }

  if (isHttpUrl(args.from)) {
    console.log(`Downloading: ${args.from}`);
    await downloadToFile(args.from, args.out);
  } else {
    const fromPath = path.isAbsolute(args.from) ? args.from : path.resolve(repoRoot, args.from);
    if (!(await fileExists(fromPath))) {
      throw new Error(`Input file not found: ${fromPath}`);
    }
    console.log(`Copying: ${fromPath}`);
    await fs.copyFile(fromPath, args.out);
  }

  const header = await readFirstBytes(args.out, 16);
  if (!looksLikeSwfHeader(header)) {
    await fs.rm(args.out, { force: true });
    throw new Error(
      "Imported file does not look like a SWF (expected FWS/CWS/ZWS header). Aborted.",
    );
  }

  console.log(`Saved: ${args.out}`);
  console.log("");
  console.log("Next steps:");
  console.log("- (Optional) Copy SWF into the web dev server path:");
  console.log("  cd apps/web && npm run sync:swf");
  console.log("- Start the web app:");
  console.log("  cd apps/web && npm run dev");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
