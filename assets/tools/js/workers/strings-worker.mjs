let cancelled = false;

self.addEventListener("message", async (event) => {
  if (event.data?.type === "cancel") { cancelled = true; return; }
  if (event.data?.type !== "scan" || !event.data.file) return;
  cancelled = false;
  const file = event.data.file;
  const minimum = Math.max(4, Number(event.data.minimum) || 4);
  const chunkSize = 2 * 1024 * 1024;
  const results = [];
  let current = "";
  let currentOffset = 0;
  const maxResults = 100_000;
  const maxTotalCharacters = 16 * 1024 * 1024;
  const maxStringLength = 65_536;
  let totalCharacters = 0;
  try {
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      if (cancelled) { self.postMessage({ type: "cancelled" }); return; }
      const chunk = new Uint8Array(await file.slice(offset, Math.min(file.size, offset + chunkSize)).arrayBuffer());
      for (let index = 0; index < chunk.length; index++) {
        const byte = chunk[index];
        if (byte >= 32 && byte <= 126) {
          if (!current) currentOffset = offset + index;
          current += String.fromCharCode(byte);
          if (current.length >= maxStringLength) {
            results.push({ offset: currentOffset, value: current });
            totalCharacters += current.length;
            current = "";
          }
        } else {
          if (current.length >= minimum) { results.push({ offset: currentOffset, value: current }); totalCharacters += current.length; }
          current = "";
          if (results.length >= maxResults || totalCharacters >= maxTotalCharacters) break;
        }
      }
      self.postMessage({ type: "progress", value: file.size ? Math.round(Math.min(file.size, offset + chunk.length) / file.size * 100) : 100 });
      if (results.length >= maxResults || totalCharacters >= maxTotalCharacters) break;
    }
    if (current.length >= minimum && results.length < maxResults && totalCharacters < maxTotalCharacters) {
      results.push({ offset: currentOffset, value: current }); totalCharacters += current.length;
    }
    self.postMessage({ type: "done", results, truncated: results.length >= maxResults || totalCharacters >= maxTotalCharacters });
  } catch (error) { self.postMessage({ type: "error", message: error instanceof Error ? error.message : "String scan failed." }); }
});
