import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

function usage() {
  console.log(`sync_versions.mjs

Usage:
  node scripts/sync_versions.mjs            # write versions from VERSION into target files
  node scripts/sync_versions.mjs --check    # verify targets match VERSION, exit non-zero if not

The canonical version is stored in the repo root VERSION file (e.g. 0.1.0).
`);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeText(filePath, text) {
  fs.writeFileSync(filePath, text, "utf8");
}

function normalizeNewline(text) {
  // Preserve trailing newline for nicer diffs.
  return text.endsWith("\n") ? text : `${text}\n`;
}

function isValidVersion(value) {
  // Simple semver-ish validation; allows pre-release/build metadata.
  return /^[0-9]+\.[0-9]+\.[0-9]+([\-+][0-9A-Za-z.-]+)?$/.test(value);
}

function updateJsonVersion(filePath, version) {
  const raw = readText(filePath);
  const obj = JSON.parse(raw);
  const before = obj.version;
  obj.version = version;
  const next = normalizeNewline(`${JSON.stringify(obj, null, 2)}`);
  return { before, next, changed: raw !== next };
}

function updatePackageLockVersion(filePath, version) {
  const raw = readText(filePath);
  const obj = JSON.parse(raw);
  const before = obj.version;
  obj.version = version;
  if (obj.packages && obj.packages[""] && typeof obj.packages[""] === "object") {
    obj.packages[""].version = version;
  }
  const next = normalizeNewline(`${JSON.stringify(obj, null, 2)}`);
  return { before, next, changed: raw !== next };
}

function replaceOrThrow(raw, regex, replacement, filePath) {
  if (!regex.test(raw)) {
    throw new Error(`Expected pattern not found in ${filePath}: ${regex}`);
  }
  return raw.replace(regex, replacement);
}

function updateAndroidVersionName(filePath, version) {
  const raw = readText(filePath);
  const next = replaceOrThrow(
    raw,
    /versionName\s+"[^"]*"/,
    `versionName "${version}"`,
    filePath,
  );
  return { before: raw, next, changed: raw !== next };
}

function updateIosMarketingVersion(filePath, version) {
  const raw = readText(filePath);
  const next = replaceOrThrow(
    raw,
    /MARKETING_VERSION\s*=\s*[^;]+;/g,
    `MARKETING_VERSION = ${version};`,
    filePath,
  );
  return { before: raw, next, changed: raw !== next };
}

function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--help") || args.has("-h")) {
    usage();
    process.exit(0);
  }
  const checkOnly = args.has("--check");

  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(here, "..");
  const versionPath = path.join(root, "VERSION");
  const version = readText(versionPath).trim();

  if (!isValidVersion(version)) {
    throw new Error(`Invalid VERSION value: "${version}" (expected e.g. 0.1.0)`);
  }

  const targets = [
    {
      kind: "json",
      path: path.join(root, "apps", "web", "package.json"),
      update: updateJsonVersion,
    },
    {
      kind: "lock",
      path: path.join(root, "apps", "web", "package-lock.json"),
      update: updatePackageLockVersion,
    },
    {
      kind: "json",
      path: path.join(root, "apps", "remake-web", "package.json"),
      update: updateJsonVersion,
    },
    {
      kind: "lock",
      path: path.join(root, "apps", "remake-web", "package-lock.json"),
      update: updatePackageLockVersion,
    },
    {
      kind: "json",
      path: path.join(root, "apps", "desktop", "package.json"),
      update: updateJsonVersion,
    },
    {
      kind: "lock",
      path: path.join(root, "apps", "desktop", "package-lock.json"),
      update: updatePackageLockVersion,
    },
    {
      kind: "android",
      path: path.join(root, "android", "app", "build.gradle"),
      update: updateAndroidVersionName,
    },
    {
      kind: "ios",
      path: path.join(root, "ios", "App", "App.xcodeproj", "project.pbxproj"),
      update: updateIosMarketingVersion,
    },
  ];

  const changedFiles = [];
  const mismatches = [];

  for (const t of targets) {
    const { next, changed } = t.update(t.path, version);
    if (checkOnly) {
      if (changed) mismatches.push(t.path);
    } else if (changed) {
      writeText(t.path, next);
      changedFiles.push(t.path);
    }
  }

  if (checkOnly) {
    if (mismatches.length) {
      console.error("Version mismatch vs VERSION for:");
      for (const p of mismatches) console.error(`- ${path.relative(root, p)}`);
      process.exit(1);
    }
    console.log("OK: all versions match VERSION");
    return;
  }

  if (changedFiles.length) {
    console.log(`Updated ${changedFiles.length} file(s) to version ${version}:`);
    for (const p of changedFiles) console.log(`- ${path.relative(root, p)}`);
  } else {
    console.log(`No changes needed (already at ${version}).`);
  }
}

main();
