import { spawn } from "node:child_process";

const command = process.platform === "win32" ? "node_modules\\.bin\\tsx.cmd" : "node_modules/.bin/tsx";
const child = spawn(command, ["watch", "server/_core/index.ts"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: "development",
  },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
