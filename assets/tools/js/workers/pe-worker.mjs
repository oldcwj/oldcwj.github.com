import { analyzePe } from "../core/pe-analyzer.mjs";

self.addEventListener("message", async (event) => {
  if (event.data?.type !== "analyze" || !event.data.file) return;
  try {
    self.postMessage({ type: "progress", message: "Reading PE headers…" });
    const result = await analyzePe(event.data.file);
    self.postMessage({ type: "done", result });
  } catch (error) {
    self.postMessage({ type: "error", message: error instanceof Error ? error.message : "PE analysis failed." });
  }
});
