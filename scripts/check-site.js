#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const errors = [];
const ignoredDirectories = new Set([".git", "node_modules"]);

function walk(directory, extension, found = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, extension, found);
    else if (entry.name.endsWith(extension)) found.push(absolute);
  }
  return found;
}

function record(condition, message) {
  if (!condition) errors.push(message);
}

function localTarget(source, reference) {
  const trimmed = reference.trim();
  if (!trimmed || trimmed.startsWith("#") || /^(?:[a-z]+:)?\/\//i.test(trimmed) || /^(?:mailto|tel|data|javascript):/i.test(trimmed)) return null;
  const clean = decodeURIComponent(trimmed.split("#")[0].split("?")[0]);
  const resolved = clean.startsWith("/") ? path.join(root, clean) : path.resolve(path.dirname(source), clean);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) return { resolved, outside: true };
  return { resolved: clean.endsWith("/") ? path.join(resolved, "index.html") : resolved, outside: false };
}

const htmlFiles = walk(root, ".html");
for (const absolute of htmlFiles) {
  const relative = path.relative(root, absolute);
  const content = fs.readFileSync(absolute, "utf8");
  const ids = [...content.matchAll(/\sid=["']([^"']+)["']/gi)].map((match) => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  record(!duplicates.length, `Duplicate id in ${relative}: ${duplicates.join(", ")}`);

  for (const match of content.matchAll(/\s(?:href|src)=["']([^"']+)["']/gi)) {
    let target;
    try { target = localTarget(absolute, match[1]); }
    catch { errors.push(`Invalid encoded URL in ${relative}: ${match[1]}`); continue; }
    if (!target) continue;
    record(!target.outside, `Local reference escapes the site root in ${relative}: ${match[1]}`);
    if (target.outside) continue;
    let resolved = target.resolved;
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) resolved = path.join(resolved, "index.html");
    record(fs.existsSync(resolved), `Broken local reference in ${relative}: ${match[1]}`);
  }
}

for (const absolute of walk(root, ".css")) {
  const relative = path.relative(root, absolute);
  const content = fs.readFileSync(absolute, "utf8");
  for (const match of content.matchAll(/url\((?:["']?)([^)'"\s]+)(?:["']?)\)/gi)) {
    const target = localTarget(absolute, match[1]);
    if (target) record(!target.outside && fs.existsSync(target.resolved), `Broken CSS asset in ${relative}: ${match[1]}`);
  }
}

const toolRoot = path.join(root, "assets/tools");
const toolSources = walk(toolRoot, ".mjs").map((file) => fs.readFileSync(file, "utf8")).join("\n");
const networkPatterns = [
  [/(^|[^\w])fetch\s*\(/, "fetch"],
  [/XMLHttpRequest/, "XMLHttpRequest"],
  [/sendBeacon\s*\(/, "sendBeacon"],
  [/new\s+WebSocket\s*\(/, "WebSocket"]
];
for (const [pattern, label] of networkPatterns) record(!pattern.test(toolSources), `Web Tool code must not use ${label}; files must stay local.`);

if (errors.length) {
  console.error(`Site integrity check failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Site integrity check passed: ${htmlFiles.length} HTML pages, local links/assets, unique IDs, and offline-only tool code verified.`);
