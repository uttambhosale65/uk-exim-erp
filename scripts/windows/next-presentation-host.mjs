import { spawn } from "node:child_process";
import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function sanitizeDiagnosticText(value) {
  return String(value ?? "")
    .replace(/(DATABASE_URL|TEST_DATABASE_URL|BETTER_AUTH_SECRET)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, "[REDACTED POSTGRESQL URL]")
    .replace(/(password|token|secret|cookie|authorization)\s*[:=]\s*["']?[^\s,"'<>]+/gi, "$1=[REDACTED]")
    .replace(/([?&](?:password|token|secret|code|session)=)[^&\s"'<>]+/gi, "$1[REDACTED]");
}

function appendSanitized(file, text) {
  if (!file) return;
  appendFileSync(file, sanitizeDiagnosticText(text), { encoding: "utf8" });
}

function main() {
  const npmCli = process.argv[2];
  if (!npmCli || !process.env.UKEXIM_ERP_STDOUT_LOG || !process.env.UKEXIM_ERP_STDERR_LOG) {
    process.stderr.write("Presentation host configuration is incomplete.\n");
    process.exitCode = 2;
    return;
  }

  const child = spawn(process.execPath, [npmCli, "run", "start"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  const buffers = { stdout: "", stderr: "" };
  const files = { stdout: process.env.UKEXIM_ERP_STDOUT_LOG, stderr: process.env.UKEXIM_ERP_STDERR_LOG };
  for (const streamName of ["stdout", "stderr"]) {
    child[streamName].setEncoding("utf8");
    child[streamName].on("data", (chunk) => {
      buffers[streamName] += chunk;
      const lines = buffers[streamName].split(/\r?\n/);
      buffers[streamName] = lines.pop() ?? "";
      for (const line of lines) appendSanitized(files[streamName], `${line}\n`);
    });
  }

  const relaySignal = (signal) => {
    if (!child.killed) child.kill(signal);
  };
  process.on("SIGINT", () => relaySignal("SIGINT"));
  process.on("SIGTERM", () => relaySignal("SIGTERM"));

  child.on("error", (error) => {
    appendSanitized(files.stderr, `Presentation process error: ${error.message}\n`);
    process.exitCode = 1;
  });
  child.on("close", (code, signal) => {
    for (const streamName of ["stdout", "stderr"]) {
      if (buffers[streamName]) appendSanitized(files[streamName], sanitizeDiagnosticText(buffers[streamName]));
    }
    process.exitCode = typeof code === "number" ? code : signal ? 1 : 0;
  });
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
const modulePath = fileURLToPath(import.meta.url);
if (invokedPath && invokedPath.toLowerCase() === modulePath.toLowerCase()) main();
