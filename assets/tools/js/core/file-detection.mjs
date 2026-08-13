const textDecoder = new TextDecoder("utf-8", { fatal: false });

const formats = {
  exe: { label: "Windows Executable (EXE)", mime: "application/vnd.microsoft.portable-executable", extensions: ["exe"] },
  dll: { label: "Windows Dynamic Link Library (DLL)", mime: "application/vnd.microsoft.portable-executable", extensions: ["dll"] },
  pe: { label: "Portable Executable (PE)", mime: "application/vnd.microsoft.portable-executable", extensions: ["exe", "dll", "sys", "scr"] },
  class: { label: "Java CLASS File", mime: "application/java-vm", extensions: ["class"] },
  apk: { label: "Android Package (APK)", mime: "application/vnd.android.package-archive", extensions: ["apk"] },
  aab: { label: "Android App Bundle (AAB)", mime: "application/x-android-app-bundle", extensions: ["aab"] },
  jar: { label: "Java Archive (JAR)", mime: "application/java-archive", extensions: ["jar"] },
  sb3: { label: "Scratch Project (SB3)", mime: "application/x.scratch.sb3", extensions: ["sb3"] },
  zip: { label: "ZIP Archive", mime: "application/zip", extensions: ["zip"] },
  pdf: { label: "PDF Document", mime: "application/pdf", extensions: ["pdf"] },
  sqlite: { label: "SQLite Database", mime: "application/vnd.sqlite3", extensions: ["sqlite", "sqlite3", "db"] },
  elf: { label: "ELF Binary", mime: "application/x-elf", extensions: ["elf", "so", "o"] },
  rar: { label: "RAR Archive", mime: "application/vnd.rar", extensions: ["rar"] },
  sevenZip: { label: "7-Zip Archive", mime: "application/x-7z-compressed", extensions: ["7z"] },
  gzip: { label: "GZIP Archive", mime: "application/gzip", extensions: ["gz", "gzip"] },
  png: { label: "PNG Image", mime: "image/png", extensions: ["png"] },
  jpeg: { label: "JPEG Image", mime: "image/jpeg", extensions: ["jpg", "jpeg", "jpe"] },
  gif: { label: "GIF Image", mime: "image/gif", extensions: ["gif"] },
  webp: { label: "WebP Image", mime: "image/webp", extensions: ["webp"] },
  mp3: { label: "MP3 Audio", mime: "audio/mpeg", extensions: ["mp3"] },
  wav: { label: "WAV Audio", mime: "audio/wav", extensions: ["wav"] },
  mp4: { label: "MP4 Media", mime: "video/mp4", extensions: ["mp4", "m4a", "m4v", "mov"] },
  json: { label: "JSON Text", mime: "application/json", extensions: ["json"] },
  xml: { label: "XML Document", mime: "application/xml", extensions: ["xml"] },
  text: { label: "Plain Text", mime: "text/plain", extensions: ["txt", "log", "csv", "ini", "md"] },
  empty: { label: "Empty File", mime: "application/x-empty", extensions: [] },
  unknown: { label: "Unknown Binary File", mime: "application/octet-stream", extensions: [] }
};

function startsWith(bytes, signature, offset = 0) {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes, start, length) {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function extensionOf(name = "") {
  const base = name.split(/[\\/]/).pop() || "";
  const dot = base.lastIndexOf(".");
  return dot > 0 && dot < base.length - 1 ? base.slice(dot + 1).toLowerCase() : "";
}

function result(id, confidence, evidence, extra = {}) {
  return { id, ...formats[id], confidence, evidence, ...extra };
}

function detectPe(bytes) {
  if (!startsWith(bytes, [0x4d, 0x5a]) || bytes.length < 0x40) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const peOffset = view.getUint32(0x3c, true);
  if (peOffset + 24 > bytes.length || !startsWith(bytes, [0x50, 0x45, 0, 0], peOffset)) {
    return result("pe", "medium", "MZ header found; PE header is outside the inspected header or invalid.");
  }
  const characteristics = view.getUint16(peOffset + 22, true);
  const isDll = Boolean(characteristics & 0x2000);
  return result(isDll ? "dll" : "exe", "high", `MZ and PE signatures with ${isDll ? "DLL" : "executable"} characteristics.`);
}

function looksLikeText(bytes) {
  if (!bytes.length) return false;
  const sample = bytes.subarray(0, Math.min(bytes.length, 8192));
  let printable = 0;
  for (const byte of sample) {
    if (byte === 0) return false;
    if (byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte < 127) || byte >= 0xc2) printable++;
  }
  return printable / sample.length > 0.9;
}

export function classifyZipEntries(entries = []) {
  const normalized = new Set(entries.map((entry) => String(entry).replace(/\\/g, "/").replace(/^\.\//, "")));
  const lower = new Set([...normalized].map((entry) => entry.toLowerCase()));
  if (lower.has("androidmanifest.xml") && [...lower].some((entry) => /^classes\d*\.dex$/.test(entry))) {
    return result("apk", "high", "ZIP container includes AndroidManifest.xml and DEX bytecode.");
  }
  if (lower.has("bundleconfig.pb") || (lower.has("base/manifest/androidmanifest.xml") && [...lower].some((entry) => /^base\/dex\/classes\d*\.dex$/.test(entry)))) {
    return result("aab", "high", "ZIP container includes Android App Bundle structure.");
  }
  if (lower.has("meta-inf/manifest.mf")) {
    return result("jar", "high", "ZIP container includes META-INF/MANIFEST.MF.");
  }
  if (lower.has("project.json")) {
    return result("sb3", "high", "ZIP container includes Scratch project.json.");
  }
  return result("zip", "high", "Valid ZIP central directory found.");
}

export function detectFormat(bytes, options = {}) {
  const fileSize = options.fileSize ?? bytes.length;
  if (fileSize === 0) return result("empty", "high", "The file contains zero bytes.");

  const pe = detectPe(bytes);
  if (pe) return pe;
  if (startsWith(bytes, [0xca, 0xfe, 0xba, 0xbe])) return result("class", "high", "CAFEBABE Java class signature.");
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06]) || startsWith(bytes, [0x50, 0x4b, 0x07, 0x08])) {
    return options.zipEntries ? classifyZipEntries(options.zipEntries) : result("zip", "medium", "ZIP signature found; container directory has not been inspected.");
  }
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return result("pdf", "high", "%PDF document signature.");
  if (ascii(bytes, 0, 16) === "SQLite format 3\0") return result("sqlite", "high", "SQLite format 3 database header.");
  if (startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46])) return result("elf", "high", "7F 45 4C 46 ELF signature.");
  if (startsWith(bytes, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]) || startsWith(bytes, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00])) return result("rar", "high", "RAR archive signature.");
  if (startsWith(bytes, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return result("sevenZip", "high", "7-Zip archive signature.");
  if (startsWith(bytes, [0x1f, 0x8b])) return result("gzip", "high", "GZIP signature 1F 8B.");
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return result("png", "high", "Eight-byte PNG signature.");
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return result("jpeg", "high", "JPEG start-of-image signature.");
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") return result("gif", "high", "GIF version signature.");
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return result("webp", "high", "RIFF container with WEBP form type.");
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WAVE") return result("wav", "high", "RIFF container with WAVE form type.");
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") return result("mp4", "high", `ISO Base Media ftyp box (${ascii(bytes, 8, 4).replace(/[^\x20-\x7e]/g, ".")}).`);
  if (ascii(bytes, 0, 3) === "ID3" || (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return result("mp3", "medium", "ID3 tag or MPEG audio frame sync found.");

  if (looksLikeText(bytes)) {
    const decoded = textDecoder.decode(bytes.subarray(0, Math.min(bytes.length, 65536))).replace(/^\uFEFF/, "").trimStart();
    if (decoded.startsWith("{") || decoded.startsWith("[")) {
      try {
        JSON.parse(decoded);
        return result("json", "high", "Text content parses as JSON.");
      } catch {
        // Continue as text when only the inspected prefix is incomplete JSON.
      }
    }
    if (/^<\?xml\b/i.test(decoded) || /^<[A-Za-z_][^>]*>/.test(decoded)) return result("xml", "medium", "Text begins with an XML declaration or element.");
    return result("text", "medium", "The inspected bytes are predominantly printable text.");
  }

  return result("unknown", "low", "No supported signature or reliable text structure was found.");
}

export function withExtensionAssessment(detection, fileName) {
  const extension = extensionOf(fileName);
  const expected = detection.extensions || [];
  const match = !extension || !expected.length ? null : expected.includes(extension);
  return {
    ...detection,
    extension,
    extensionMatch: match,
    extensionMessage: match === false
      ? `The .${extension} extension does not match the detected ${detection.label} format.`
      : match === true ? "The file extension agrees with the detected format." : "The extension is not used as the primary detection evidence."
  };
}

export function hexSignature(bytes, count = 16) {
  return [...bytes.subarray(0, count)].map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(" ") || "—";
}

export function formatBytes(value) {
  if (!Number.isFinite(value) || value < 0) return "—";
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = value;
  let unit = -1;
  do { size /= 1024; unit++; } while (size >= 1024 && unit < units.length - 1);
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unit]}`;
}

export function makeHexRows(bytes, maxBytes = 256) {
  const rows = [];
  const sample = bytes.subarray(0, maxBytes);
  for (let offset = 0; offset < sample.length; offset += 16) {
    const row = sample.subarray(offset, offset + 16);
    rows.push({
      offset: offset.toString(16).padStart(8, "0").toUpperCase(),
      hex: [...row].map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(" ").padEnd(47, " "),
      ascii: [...row].map((byte) => byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".").join("")
    });
  }
  return rows;
}

export function extractStrings(bytes, minimumLength = 4, limit = 40) {
  const strings = [];
  let current = "";
  for (const byte of bytes) {
    if (byte >= 32 && byte <= 126) current += String.fromCharCode(byte);
    else {
      if (current.length >= minimumLength) strings.push(current);
      current = "";
      if (strings.length >= limit) break;
    }
  }
  if (strings.length < limit && current.length >= minimumLength) strings.push(current);
  return strings.slice(0, limit);
}
