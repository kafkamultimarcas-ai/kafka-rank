import { spawn } from "node:child_process";

const command = process.platform === "win32" ? "node" : "node";
const child = spawn(command, ["dist/index.js"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: "production",
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
