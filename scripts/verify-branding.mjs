import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { APP_TITLE, BRANDING } from "../src/config/branding.js";

// Run after a build with a local production preview, e.g.
// node scripts/verify-branding.mjs http://127.0.0.1:4174/
const base = new URL(process.argv[2] || "http://127.0.0.1:4174/");
const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("dist/manifest.webmanifest", root), "utf8"));
assert.equal(manifest.name, APP_TITLE);
assert.equal(manifest.short_name, BRANDING.name);
assert.equal(manifest.icons.find(icon => icon.purpose === "maskable")?.sizes, "512x512");
const escapeHTML = value => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
const indexResponse = await fetch(base);
assert.equal(indexResponse.status, 200);
const html = await indexResponse.text();
assert.ok(html.includes(`<title>${escapeHTML(APP_TITLE)}</title>`));
for (const file of ["favicon.ico", "icons/favicon-32.png", "icons/apple-touch-icon.png"]) assert.ok(html.includes(file));

const assets = [
  ["favicon.ico", null], ["icons/favicon-32.png", 32], ["icons/apple-touch-icon.png", 180],
  ...manifest.icons.map(icon => [icon.src, Number(icon.sizes.split("x")[0])]),
];
const worker = await readFile(new URL("dist/sw.js", root), "utf8");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
await Promise.all(assets.map(async ([file, size]) => {
  const response = await fetch(new URL(file, base));
  assert.equal(response.status, 200, `${file}: HTTP status`);
  assert.match(response.headers.get("content-type") || "", size ? /image\/png/ : /image\/(x-icon|vnd.microsoft.icon)/);
  const served = Buffer.from(await response.arrayBuffer());
  const source = await readFile(new URL(`public/${file}`, root));
  assert.equal(hash(served), hash(source), `${file}: served/source hash`);
  if (size) {
    assert.equal(served.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(served.readUInt32BE(16), size, `${file}: width`);
    assert.equal(served.readUInt32BE(20), size, `${file}: height`);
  } else {
    assert.equal(served.readUInt16LE(2), 1);
    assert.equal(served.readUInt16LE(4), 3);
    assert.deepEqual([served[6], served[22], served[38]], [16, 32, 48]);
  }
  assert.ok(worker.includes(file), `${file}: offline precache`);
  console.log(`${file}: HTTP 200, correct dimensions/type, exact source bytes, precached`);
}));
assert.ok(!worker.includes("probe.png"));
console.log(`Browser title and generated PWA name: ${APP_TITLE}; short name: ${manifest.short_name}`);
