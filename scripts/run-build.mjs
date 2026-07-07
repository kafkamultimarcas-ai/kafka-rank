import { spawn } from "node:child_process";

const run = (command, args, env = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        ...env,
      },
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed with exit code ${code ?? 1}`));
    });
  });

const viteCommand = process.platform === "win32" ? "node_modules\\.bin\\vite.cmd" : "node_modules/.bin/vite";
const esbuildCommand = process.platform === "win32" ? "node_modules\\.bin\\esbuild.cmd" : "node_modules/.bin/esbuild";

await run(viteCommand, ["build"], { NODE_ENV: "production" });
await run(esbuildCommand, [
  "server/_core/index.ts",
  "--platform=node",
  "--packages=external",
  "--bundle",
  "--format=esm",
  "--outdir=dist",
], { NODE_ENV: "production" });
