import test from "node:test";
import assert from "node:assert/strict";
import { parseCentralDirectory, readZipDirectory } from "../assets/tools/js/core/zip-directory.mjs";

function directoryEntry(name) {
  const encoded = new TextEncoder().encode(name);
  const bytes = new Uint8Array(46 + encoded.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(28, encoded.length, true);
  bytes.set(encoded, 46);
  return bytes;
}

test("parses bounded central directory names", () => {
  const first = directoryEntry("META-INF/MANIFEST.MF");
  const second = directoryEntry("Hello.class");
  const combined = new Uint8Array(first.length + second.length);
  combined.set(first); combined.set(second, first.length);
  assert.deepEqual(parseCentralDirectory(combined, 2), ["META-INF/MANIFEST.MF", "Hello.class"]);
});

test("rejects malformed directory metadata", () => {
  assert.throws(() => parseCentralDirectory(new Uint8Array(46), 1), /Invalid ZIP/);
  assert.throws(() => parseCentralDirectory(directoryEntry("one.txt"), 2), /entry count/);
});

test("reads a complete ZIP directory without extracting entries", async () => {
  const central = directoryEntry("project.json");
  const eocd = new Uint8Array(22);
  const view = new DataView(eocd.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, 1, true); view.setUint16(10, 1, true);
  view.setUint32(12, central.length, true); view.setUint32(16, 0, true);
  const archive = new Blob([central, eocd]);
  assert.deepEqual(await readZipDirectory(archive), ["project.json"]);
});
