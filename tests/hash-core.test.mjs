import test from "node:test";
import assert from "node:assert/strict";
import { hashBytes, Md5, Sha1, Sha256 } from "../assets/tools/js/core/hash-core.mjs";

const encoder = new TextEncoder();

test("matches SHA-256, SHA-1 and MD5 standard vectors", () => {
  assert.deepEqual(hashBytes(encoder.encode("")), {
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    sha1: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
    md5: "d41d8cd98f00b204e9800998ecf8427e"
  });
  assert.deepEqual(hashBytes(encoder.encode("abc")), {
    sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    sha1: "a9993e364706816aba3e25717850c26c9cd0d89d",
    md5: "900150983cd24fb0d6963f7d28e17f72"
  });
});

test("incremental hashing matches single update", () => {
  const sha = new Sha256().update(encoder.encode("a")).update(encoder.encode("bc")).digest();
  const md5 = new Md5().update(encoder.encode("a")).update(encoder.encode("bc")).digest();
  const sha1 = new Sha1().update(encoder.encode("a")).update(encoder.encode("bc")).digest();
  assert.equal(sha, hashBytes(encoder.encode("abc")).sha256);
  assert.equal(md5, hashBytes(encoder.encode("abc")).md5);
  assert.equal(sha1, hashBytes(encoder.encode("abc")).sha1);
});

test("hashes data spanning multiple 64-byte blocks", () => {
  const message = encoder.encode("The quick brown fox jumps over the lazy dog".repeat(20));
  const sha = new Sha256();
  const md5 = new Md5();
  const sha1 = new Sha1();
  for (let offset = 0; offset < message.length; offset += 17) {
    const chunk = message.subarray(offset, offset + 17);
    sha.update(chunk); sha1.update(chunk); md5.update(chunk);
  }
  assert.equal(sha.digest(), "1b6881b4a664a953a827a2f02d44d703354913a40e55008506d11fd3c51f4417");
  assert.equal(md5.digest(), "d9662ab17f9176d720ff0f5cdee301fd");
  assert.equal(sha1.digest(), "0965dd1322c97f9ba0b9324523ebb019a0c08311");
});
