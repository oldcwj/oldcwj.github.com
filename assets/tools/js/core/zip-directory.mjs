const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const MAX_TAIL_BYTES = 65_557;
const MAX_ENTRIES = 10_000;
const MAX_DIRECTORY_BYTES = 8 * 1024 * 1024;
const decoder = new TextDecoder("utf-8", { fatal: false });

function findEocd(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = bytes.length - 22; offset >= 0; offset--) {
    if (view.getUint32(offset, true) !== EOCD_SIGNATURE) continue;
    const commentLength = view.getUint16(offset + 20, true);
    if (offset + 22 + commentLength === bytes.length) return offset;
  }
  return -1;
}

export function parseCentralDirectory(bytes, expectedEntries) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = [];
  let offset = 0;
  while (offset + 46 <= bytes.length && entries.length < expectedEntries) {
    if (view.getUint32(offset, true) !== CENTRAL_SIGNATURE) throw new Error("Invalid ZIP central directory entry.");
    const flags = view.getUint16(offset + 8, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if (nameLength > 4096 || next > bytes.length) throw new Error("Malformed ZIP entry name or length.");
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLength);
    let name = decoder.decode(nameBytes);
    if (!(flags & 0x0800)) name = [...nameBytes].map((byte) => byte < 128 ? String.fromCharCode(byte) : "�").join("");
    entries.push(name);
    offset = next;
  }
  if (entries.length !== expectedEntries) throw new Error("ZIP directory entry count does not match its metadata.");
  return entries;
}

export async function readZipDirectory(file) {
  const tailStart = Math.max(0, file.size - MAX_TAIL_BYTES);
  const tail = new Uint8Array(await file.slice(tailStart).arrayBuffer());
  const eocdOffset = findEocd(tail);
  if (eocdOffset < 0) throw new Error("ZIP end-of-central-directory record was not found.");
  const view = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  const disk = view.getUint16(eocdOffset + 4, true);
  const directoryDisk = view.getUint16(eocdOffset + 6, true);
  const entriesOnDisk = view.getUint16(eocdOffset + 8, true);
  const entryCount = view.getUint16(eocdOffset + 10, true);
  const directorySize = view.getUint32(eocdOffset + 12, true);
  const directoryOffset = view.getUint32(eocdOffset + 16, true);

  if (disk !== 0 || directoryDisk !== 0 || entriesOnDisk !== entryCount) throw new Error("Multi-disk ZIP archives are not supported.");
  if (entryCount === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) throw new Error("ZIP64 archives are not supported in this version.");
  if (entryCount > MAX_ENTRIES) throw new Error(`Archive has more than ${MAX_ENTRIES.toLocaleString()} entries.`);
  if (directorySize > MAX_DIRECTORY_BYTES) throw new Error("ZIP central directory exceeds the 8 MB safety limit.");
  if (directoryOffset + directorySize > file.size) throw new Error("ZIP central directory points outside the file.");

  const directory = new Uint8Array(await file.slice(directoryOffset, directoryOffset + directorySize).arrayBuffer());
  return parseCentralDirectory(directory, entryCount);
}
