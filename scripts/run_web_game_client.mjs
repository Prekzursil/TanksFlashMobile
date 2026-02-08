import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

function getDefaultClientPath() {
  return path.join(
    os.homedir(),
    ".codex",
    "skills",
    "develop-web-game",
    "scripts",
    "web_game_playwright_client.js",
  );
}

function main() {
  const clientPath = process.env.WEB_GAME_CLIENT || getDefaultClientPath();
  const args = process.argv.slice(2);

  const child = spawn(process.execPath, ["--no-warnings", clientPath, ...args], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    process.exit(typeof code === "number" ? code : 1);
  });
}

main();

