import { detectFormat, extractStrings, formatBytes, hexSignature, makeHexRows, withExtensionAssessment } from "./core/file-detection.mjs";
import { readZipDirectory } from "./core/zip-directory.mjs";
import { bindFileDropZone, revealResults, setDropZoneBusy } from "./core/tool-ui.mjs";

const input = document.querySelector("#file-input");
const dropZone = document.querySelector("#drop-zone");
const resetButton = document.querySelector("#reset-file");
const status = document.querySelector("#analysis-status");
const results = document.querySelector("#inspection-results");
const largeFileNote = document.querySelector("#large-file-note");
const fields = Object.fromEntries([...document.querySelectorAll("[data-field]")].map((node) => [node.dataset.field, node]));
let hashWorker = null;

function setStatus(message, kind = "working") {
  status.textContent = message;
  status.dataset.kind = kind;
  status.hidden = false;
}

function value(field, content) {
  if (fields[field]) fields[field].textContent = content ?? "—";
}

function renderHex(bytes) {
  const rows = makeHexRows(bytes, 256);
  document.querySelector("#hex-preview").textContent = rows.length
    ? rows.map((row) => `${row.offset}  ${row.hex}  ${row.ascii}`).join("\n")
    : "The file is empty.";
}

function renderStrings(bytes) {
  const strings = extractStrings(bytes, 4, 30);
  document.querySelector("#strings-preview").textContent = strings.length ? strings.join("\n") : "No printable ASCII strings found in the inspected sample.";
}

function renderRoute(detection) {
  const panel = document.querySelector("#specialized-route");
  panel.hidden = true;
  for (const promotion of document.querySelectorAll("[data-promo-formats]")) {
    const formats = promotion.dataset.promoFormats.split(/\s+/);
    promotion.hidden = !formats.includes(detection.id);
  }
  if (detection.id === "jar") {
    panel.innerHTML = `<div><strong>JAR file detected</strong><p>Use the dedicated JAR Inspector to browse archive contents and MANIFEST.MF.</p></div><a class="btn blue" href="https://jarfileopener.com/">Open JAR Inspector →</a>`;
    panel.hidden = false;
  } else if (detection.id === "exe" || detection.id === "dll" || detection.id === "pe") {
    const route = detection.id === "dll" ? "dll-inspector" : "exe-inspector";
    const label = detection.id === "dll" ? "DLL" : "EXE";
    panel.innerHTML = `<div><strong>${label} file detected</strong><p>Open the specialized PE Inspector for headers, sections, imports, exports and indicators.</p></div><a class="btn blue" href="../${route}/index.html">Open ${label} Inspector →</a>`;
    panel.hidden = false;
  }
}

function calculateHashes(file) {
  if (hashWorker) hashWorker.terminate();
  hashWorker = new Worker("../assets/tools/js/workers/hash-worker.mjs", { type: "module" });
  value("sha256", "Calculating…"); value("md5", "Calculating…");
  hashWorker.addEventListener("message", (event) => {
    if (event.data.type === "progress") value("hashProgress", `${event.data.value}%`);
    if (event.data.type === "done") {
      value("sha256", event.data.sha256); value("md5", event.data.md5); value("hashProgress", "Complete");
      hashWorker.terminate(); hashWorker = null;
    }
    if (event.data.type === "error") {
      value("sha256", "Unavailable"); value("md5", "Unavailable"); value("hashProgress", event.data.message);
      hashWorker.terminate(); hashWorker = null;
    }
  });
  hashWorker.postMessage({ type: "hash", file });
}

async function inspectFile(file) {
  if (!file) return;
  results.hidden = true;
  resetButton.hidden = false;
  largeFileNote.hidden = file.size < 100 * 1024 * 1024;
  setDropZoneBusy(dropZone, true);
  setStatus("Analyzing file locally…");
  try {
    const headerSize = Math.min(file.size, 64 * 1024);
    const previewSize = Math.min(file.size, 1024 * 1024);
    const header = new Uint8Array(await file.slice(0, headerSize).arrayBuffer());
    const preview = previewSize === headerSize ? header : new Uint8Array(await file.slice(0, previewSize).arrayBuffer());
    let detection = detectFormat(header, { fileSize: file.size });
    let zipError = "";
    if (detection.id === "zip") {
      try {
        const entries = await readZipDirectory(file);
        detection = detectFormat(header, { fileSize: file.size, zipEntries: entries });
        value("archiveEntries", entries.length.toLocaleString());
      } catch (error) {
        zipError = error instanceof Error ? error.message : "Archive directory could not be inspected.";
        value("archiveEntries", "Unavailable");
      }
    } else value("archiveEntries", "Not an archive");

    detection = withExtensionAssessment(detection, file.name);
    value("fileName", file.name || "Unnamed file");
    value("fileSize", formatBytes(file.size));
    value("extension", detection.extension ? `.${detection.extension}` : "None");
    value("browserMime", file.type || "Not provided");
    value("detectedFormat", detection.label);
    value("confidence", detection.confidence[0].toUpperCase() + detection.confidence.slice(1));
    value("evidence", zipError ? `${detection.evidence} ${zipError}` : detection.evidence);
    value("magicBytes", hexSignature(header));
    const extensionNode = fields.extensionMatch;
    extensionNode.textContent = detection.extensionMessage;
    extensionNode.dataset.match = detection.extensionMatch === false ? "mismatch" : detection.extensionMatch === true ? "match" : "neutral";
    renderHex(header); renderStrings(preview); renderRoute(detection); calculateHashes(file);
    revealResults(results);
    setStatus("Analysis complete. Your file was not uploaded.", "success");
  } catch (error) {
    setStatus(`We couldn't analyze this file. ${error instanceof Error ? error.message : "Your file was not uploaded."}`, "error");
  } finally {
    setDropZoneBusy(dropZone, false);
  }
}

bindFileDropZone({ dropZone, input, chooseButton: document.querySelector("#file-choose"), onFile: inspectFile });
resetButton.addEventListener("click", () => {
  if (hashWorker) hashWorker.terminate(); hashWorker = null;
  input.value = ""; results.hidden = true; resetButton.hidden = true; largeFileNote.hidden = true; status.hidden = true;
  document.querySelector("#file-choose").focus();
});
