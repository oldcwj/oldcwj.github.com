#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makePe32Fixture } from "../tests/helpers/pe-fixture.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "tests/fixtures");
const encoder = new TextEncoder();

function zipEntry(name, localOffset) {
  const encoded = encoder.encode(name);
  const local = new Uint8Array(30 + encoded.length);
  const localView = new DataView(local.buffer);
  localView.setUint32(0, 0x04034b50, true);
  localView.setUint16(4, 20, true);
  localView.setUint16(6, 0x0800, true);
  localView.setUint16(26, encoded.length, true);
  local.set(encoded, 30);

  const central = new Uint8Array(46 + encoded.length);
  const centralView = new DataView(central.buffer);
  centralView.setUint32(0, 0x02014b50, true);
  centralView.setUint16(4, 20, true);
  centralView.setUint16(6, 20, true);
  centralView.setUint16(8, 0x0800, true);
  centralView.setUint16(28, encoded.length, true);
  centralView.setUint32(42, localOffset, true);
  central.set(encoded, 46);
  return { local, central };
}

function makeZip(names) {
  const entries = [];
  let offset = 0;
  for (const name of names) {
    const entry = zipEntry(name, offset);
    entries.push(entry);
    offset += entry.local.length;
  }
  const centralOffset = offset;
  const centralSize = entries.reduce((sum, entry) => sum + entry.central.length, 0);
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, entries.length, true);
  view.setUint16(10, entries.length, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  return new Uint8Array([...entries.flatMap((entry) => [...entry.local]), ...entries.flatMap((entry) => [...entry.central]), ...end]);
}

await fs.mkdir(output, { recursive: true });
await Promise.all([
  fs.writeFile(path.join(output, "sample.exe"), makePe32Fixture()),
  fs.writeFile(path.join(output, "sample.dll"), makePe32Fixture({ dll: true, dotNet: true })),
  fs.writeFile(path.join(output, "sample.jar"), makeZip(["META-INF/MANIFEST.MF", "Hello.class"])),
  fs.writeFile(path.join(output, "sample.txt"), "Coobbi browser fixture\nReadableString1234\nSearchTarget\n"),
  fs.writeFile(path.join(output, "not-a-pe.bin"), encoder.encode("This is not a Portable Executable file."))
]);

console.log(`Generated 5 browser fixtures in ${path.relative(root, output)}.`);
