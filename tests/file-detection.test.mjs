import test from "node:test";
import assert from "node:assert/strict";
import { classifyZipEntries, detectFormat, extractStrings, hexSignature, makeHexRows, withExtensionAssessment } from "../assets/tools/js/core/file-detection.mjs";

const bytes = (...values) => new Uint8Array(values);
const ascii = (value) => new TextEncoder().encode(value);

test("detects common magic signatures", () => {
  assert.equal(detectFormat(bytes(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a)).id, "png");
  assert.equal(detectFormat(bytes(0xff,0xd8,0xff,0xe0)).id, "jpeg");
  assert.equal(detectFormat(ascii("%PDF-1.7")).id, "pdf");
  assert.equal(detectFormat(bytes(0x7f,0x45,0x4c,0x46)).id, "elf");
  assert.equal(detectFormat(bytes(0xca,0xfe,0xba,0xbe)).id, "class");
  assert.equal(detectFormat(bytes(0x37,0x7a,0xbc,0xaf,0x27,0x1c)).id, "sevenZip");
});

test("distinguishes PE executable and DLL characteristics", () => {
  const pe = new Uint8Array(128);
  pe[0]=0x4d;pe[1]=0x5a;pe[0x3c]=0x40;pe[0x40]=0x50;pe[0x41]=0x45;
  assert.equal(detectFormat(pe).id, "exe");
  pe[0x40+22]=0x00;pe[0x40+23]=0x20;
  assert.equal(detectFormat(pe).id, "dll");
});

test("uses ZIP structure to classify container families", () => {
  assert.equal(classifyZipEntries(["META-INF/MANIFEST.MF", "a.class"]).id, "jar");
  assert.equal(classifyZipEntries(["AndroidManifest.xml", "classes.dex"]).id, "apk");
  assert.equal(classifyZipEntries(["BundleConfig.pb", "base/manifest/AndroidManifest.xml"]).id, "aab");
  assert.equal(classifyZipEntries(["project.json", "asset.svg"]).id, "sb3");
  assert.equal(classifyZipEntries(["notes.txt"]).id, "zip");
});

test("reports extension mismatch without using extension as detection", () => {
  const detected = withExtensionAssessment(detectFormat(bytes(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a)), "photo.dat");
  assert.equal(detected.id, "png");
  assert.equal(detected.extensionMatch, false);
  assert.match(detected.extensionMessage, /does not match/);
});

test("detects JSON, XML, text, empty and unknown data", () => {
  assert.equal(detectFormat(ascii('{"ok":true}')).id, "json");
  assert.equal(detectFormat(ascii("<?xml version=\"1.0\"?><root/>")).id, "xml");
  assert.equal(detectFormat(ascii("plain readable text\n")).id, "text");
  assert.equal(detectFormat(new Uint8Array(), { fileSize: 0 }).id, "empty");
  assert.equal(detectFormat(bytes(0,1,2,3,4,5)).id, "unknown");
});

test("creates bounded hex and strings previews", () => {
  assert.equal(hexSignature(bytes(0,15,255)), "00 0F FF");
  const rows = makeHexRows(ascii("abcdefghijklmnopq"));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].offset, "00000000");
  assert.deepEqual(extractStrings(bytes(0,65,66,67,68,0,49,50,51), 4), ["ABCD"]);
});
