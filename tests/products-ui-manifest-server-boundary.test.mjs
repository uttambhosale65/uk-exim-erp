import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve("app");
const wrapperPath = path.join(appRoot, "product/server/products-ui-test-manifest.server.ts");
const routePaths = [
  "api/auth/[...all]/route.ts",
  "api/products/route.ts",
  "api/products/[id]/route.ts",
];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return /\.(?:[cm]?[jt]sx?)$/.test(entry.name) ? [fullPath] : [];
  }));
  return nested.flat();
}

test("filesystem manifest is reachable from Next routes only through a server-only wrapper", async () => {
  const wrapper = await readFile(wrapperPath, "utf8");
  assert.match(wrapper, /^import\s+["']server-only["'];/);
  assert.match(wrapper, /from\s+["']\.\/products-ui-test-manifest\.mjs["']/);

  for (const relativePath of routePaths) {
    const source = await readFile(path.join(appRoot, relativePath), "utf8");
    assert.match(source, /products-ui-test-manifest\.server/);
    assert.doesNotMatch(source, /products-ui-test-manifest\.mjs/);
  }

  for (const filePath of await sourceFiles(appRoot)) {
    const source = await readFile(filePath, "utf8");
    if (/^["']use client["'];?/m.test(source)) {
      assert.doesNotMatch(source, /products-ui-test-manifest(?:\.server)?(?:\.mjs)?["']/,
        `${path.relative(appRoot, filePath)} must not import the filesystem manifest`);
    }
  }
});
