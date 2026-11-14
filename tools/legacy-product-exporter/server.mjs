import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const PORT = 3000;
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FILES = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/export.js", ["export.js", "text/javascript; charset=utf-8"]],
  ["/export-core.mjs", ["export-core.mjs", "text/javascript; charset=utf-8"]],
]);

const securityHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

const server = createServer(async (request, response) => {
  if (request.method !== "GET") {
    response.writeHead(405, { ...securityHeaders, Allow: "GET" });
    response.end("Method not allowed");
    return;
  }

  if (!["localhost:3000", "127.0.0.1:3000"].includes(request.headers.host)) {
    response.writeHead(400, securityHeaders);
    response.end("Use the original local ERP origin: http://localhost:3000");
    return;
  }

  let pathname;
  try {
    pathname = new URL(request.url, "http://localhost:3000").pathname;
  } catch {
    response.writeHead(400, securityHeaders);
    response.end("Invalid request");
    return;
  }

  const file = FILES.get(pathname);
  if (!file) {
    response.writeHead(404, securityHeaders);
    response.end("Not found");
    return;
  }

  try {
    const body = await readFile(path.join(ROOT, file[0]));
    response.writeHead(200, { ...securityHeaders, "Content-Type": file[1] });
    response.end(body);
  } catch {
    response.writeHead(500, securityHeaders);
    response.end("Exporter file unavailable");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Legacy product exporter listening at http://localhost:${PORT}/ (bound to ${HOST} only).`);
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error("Port 3000 is already in use. Stop and investigate the existing listener; this exporter will not select another port.");
  } else {
    console.error("Legacy product exporter could not start.");
  }
  process.exitCode = 1;
});
