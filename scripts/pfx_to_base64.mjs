import fs from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    inPath: null,
    outPath: path.join("output", "windows-cert.pfx.base64"),
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--in" && next) {
      args.inPath = next;
      i++;
    } else if (arg === "--out" && next) {
      args.outPath = next;
      i++;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.inPath) {
    console.error("Missing required arg: --in /path/to/codesign.pfx");
    process.exit(2);
  }

  const buf = await fs.readFile(args.inPath);
  const base64 = buf.toString("base64");

  await fs.mkdir(path.dirname(args.outPath), { recursive: true });
  await fs.writeFile(args.outPath, base64, { encoding: "utf8" });
  console.log(`Wrote base64 to ${args.outPath}`);
  console.log("Note: this file is sensitive; delete it after setting GitHub secrets.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
