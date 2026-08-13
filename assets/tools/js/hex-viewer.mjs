import { formatBytes, makeHexRows } from "./core/file-detection.mjs";
import { bindFileDropZone, setDropZoneBusy } from "./core/tool-ui.mjs";

const PAGE_SIZE = 4096;
const input = document.querySelector("#hex-file-input");
const drop = document.querySelector("#hex-drop-zone");
const status = document.querySelector("#hex-status");
const panel = document.querySelector("#hex-results");
const output = document.querySelector("#hex-output");
const pageLabel = document.querySelector("#hex-page-label");
const previous = document.querySelector("#hex-previous");
const next = document.querySelector("#hex-next");
const offsetInput = document.querySelector("#hex-offset");
const searchInput = document.querySelector("#hex-search");
const searchMode = document.querySelector("#hex-search-mode");
const searchButton = document.querySelector("#hex-search-button");
const cancelButton = document.querySelector("#hex-search-cancel");
let file = null;
let pageOffset = 0;
let searchController = null;

function say(message, kind = "success") { status.textContent = message; status.dataset.kind = kind; status.hidden = false; }

async function renderPage(offset = 0) {
  if (!file) return;
  const lastRowOffset = file.size ? Math.floor((file.size - 1) / 16) * 16 : 0;
  pageOffset = Math.max(0, Math.min(Math.floor(offset / 16) * 16, lastRowOffset));
  const bytes = new Uint8Array(await file.slice(pageOffset, Math.min(file.size, pageOffset + PAGE_SIZE)).arrayBuffer());
  const rows = makeHexRows(bytes, PAGE_SIZE).map((row) => ({ ...row, offset: (pageOffset + parseInt(row.offset, 16)).toString(16).padStart(8, "0").toUpperCase() }));
  output.textContent = rows.length ? rows.map((row) => `${row.offset}  ${row.hex}  ${row.ascii}`).join("\n") : "The file is empty.";
  const end = Math.min(file.size, pageOffset + bytes.length);
  pageLabel.textContent = `${file.name} · ${formatBytes(file.size)} · bytes ${pageOffset.toLocaleString()}–${Math.max(pageOffset, end - 1).toLocaleString()}`;
  previous.disabled = pageOffset === 0; next.disabled = end >= file.size; offsetInput.value = `0x${pageOffset.toString(16).toUpperCase()}`;
  panel.hidden = false;
}

function parseNeedle(value, mode) {
  if (mode === "ascii") return new TextEncoder().encode(value);
  const normalized = value.replace(/0x/gi, "").replace(/[\s,:-]/g, "");
  if (!normalized || normalized.length % 2 || !/^[0-9a-f]+$/i.test(normalized)) throw new Error("Enter complete HEX byte pairs, such as 50 4B 03 04.");
  const result = Uint8Array.from(normalized.match(/.{2}/g).map((part) => parseInt(part, 16)));
  if (result.length > 4096) throw new Error("Search patterns are limited to 4,096 bytes.");
  return result;
}

function findBytes(haystack, needle) {
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i+j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

async function search() {
  if (!file) return;
  if (searchController) searchController.cancelled = true;
  let needle;
  try { needle = parseNeedle(searchInput.value, searchMode.value); } catch (error) { say(error.message, "error"); return; }
  if (needle.length > 4096) { say("Search patterns are limited to 4,096 bytes.", "error"); return; }
  if (!needle.length) { say("Enter a search value.", "error"); return; }
  searchController = { cancelled: false };
  const controller = searchController;
  const chunkSize = 1024 * 1024;
  let carry = new Uint8Array();
  cancelButton.hidden = false;
  searchButton.disabled = true;
  setDropZoneBusy(drop, true);
  say("Searching locally…", "working");
  try {
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      if (controller.cancelled) return;
      const chunk = new Uint8Array(await file.slice(offset, Math.min(file.size, offset + chunkSize)).arrayBuffer());
      const combined = new Uint8Array(carry.length + chunk.length); combined.set(carry); combined.set(chunk, carry.length);
      const found = findBytes(combined, needle);
      if (found >= 0) {
        const absolute = offset - carry.length + found;
        await renderPage(Math.floor(absolute / PAGE_SIZE) * PAGE_SIZE);
        say(`Match found at offset 0x${absolute.toString(16).toUpperCase()} (${absolute.toLocaleString()}).`);
        return;
      }
      carry = combined.slice(Math.max(0, combined.length - needle.length + 1));
      say(`Searching locally… ${Math.round(Math.min(file.size, offset + chunk.length) / Math.max(1, file.size) * 100)}%`, "working");
    }
    say("No match was found.", "error");
  } catch (error) {
    say(`Search failed. ${error instanceof Error ? error.message : "The file could not be read."}`, "error");
  } finally {
    if (searchController === controller) searchController = null;
    cancelButton.hidden = true;
    searchButton.disabled = false;
    setDropZoneBusy(drop, false);
  }
}

function select(selected) { if (!selected) return; if (searchController) searchController.cancelled = true; file = selected; pageOffset = 0; searchController = null; renderPage(0); say("File opened locally."); }
bindFileDropZone({ dropZone: drop, input, chooseButton: document.querySelector("#hex-file-choose"), onFile: select });
previous.addEventListener("click", () => renderPage(Math.max(0, pageOffset - PAGE_SIZE)));
next.addEventListener("click", () => renderPage(pageOffset + PAGE_SIZE));
document.querySelector("#hex-go").addEventListener("click", () => {
  const raw = offsetInput.value.trim(); const offset = /^0x/i.test(raw) ? parseInt(raw.slice(2),16) : Number(raw);
  if (!Number.isFinite(offset) || offset < 0) say("Enter a valid decimal or 0x-prefixed HEX offset.", "error"); else renderPage(offset);
});
searchButton.addEventListener("click", search);
cancelButton.addEventListener("click", () => {
  if (!searchController) return;
  searchController.cancelled = true;
  say("Search cancelled.", "error");
});
offsetInput.addEventListener("keydown", (event) => { if (event.key === "Enter") document.querySelector("#hex-go").click(); });
searchInput.addEventListener("keydown", (event) => { if (event.key === "Enter") search(); });
