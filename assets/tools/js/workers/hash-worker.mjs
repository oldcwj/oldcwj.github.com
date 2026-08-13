import { Md5, Sha1, Sha256 } from "../core/hash-core.mjs";

let cancelled = false;

self.addEventListener("message", async (event) => {
  if (event.data?.type === "cancel") { cancelled = true; return; }
  if (event.data?.type !== "hash" || !event.data.file) return;
  cancelled = false;
  const file = event.data.file;
  const sha256 = new Sha256();
  const sha1 = new Sha1();
  const md5 = new Md5();
  const chunkSize = 2 * 1024 * 1024;
  try {
    if (file.size === 0) self.postMessage({ type: "progress", value: 100 });
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      if (cancelled) { self.postMessage({ type: "cancelled" }); return; }
      const chunk = new Uint8Array(await file.slice(offset, Math.min(file.size, offset + chunkSize)).arrayBuffer());
      sha256.update(chunk); sha1.update(chunk); md5.update(chunk);
      self.postMessage({ type: "progress", value: file.size ? Math.round(Math.min(file.size, offset + chunk.length) / file.size * 100) : 100 });
    }
    self.postMessage({ type: "done", sha256: sha256.digest(), sha1: sha1.digest(), md5: md5.digest() });
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : "Hash calculation failed." });
  }
});
