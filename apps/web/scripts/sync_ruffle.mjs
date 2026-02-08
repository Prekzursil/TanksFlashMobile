import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, "..");

const sourceDir = path.join(webRoot, "node_modules", "@ruffle-rs", "ruffle");
const destDir = path.join(webRoot, "public", "ruffle");

async function copyFileIfChanged(sourcePath, destPath) {
  const [sourceStat, destStat] = await Promise.allSettled([fs.stat(sourcePath), fs.stat(destPath)]);

  if (sourceStat.status !== "fulfilled") {
    throw new Error(`Missing source file: ${sourcePath}`);
  }

  const sameSize = destStat.status === "fulfilled" && sourceStat.value.size === destStat.value.size;

  if (sameSize) return false;

  await fs.copyFile(sourcePath, destPath);
  return true;
}

async function main() {
  try {
    await fs.access(sourceDir);
  } catch {
    console.error(
      [
        "Missing Ruffle dependency files.",
        `Expected: ${sourceDir}`,
        "",
        "Run `npm install` first.",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  await fs.mkdir(destDir, { recursive: true });

  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  const copied = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name === "README.md") continue;
    const from = path.join(sourceDir, entry.name);
    const to = path.join(destDir, entry.name);
    const didCopy = await copyFileIfChanged(from, to);
    if (didCopy) copied.push(entry.name);
  }

  if (copied.length) {
    console.log(`Synced Ruffle assets to ${destDir}`);
    for (const name of copied) console.log(`- ${name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
