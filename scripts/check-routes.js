#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const inventory = JSON.parse(fs.readFileSync(path.join(root, "data/existing-routes.json"), "utf8"));
const sitemapPath = path.join(root, "sitemap.xml");
const sitemap = fs.readFileSync(sitemapPath, "utf8");
const errors = [];

function record(condition, message) {
  if (!condition) errors.push(message);
}

for (const route of inventory.htmlRoutes) {
  const absolutePath = path.join(root, route.file);
  record(fs.existsSync(absolutePath), `Missing protected route file: ${route.file}`);
  if (!fs.existsSync(absolutePath)) continue;

  const content = fs.readFileSync(absolutePath, "utf8");
  const canonical = content.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
  record(canonical === route.canonical, `Canonical mismatch in ${route.file}: expected ${route.canonical}, found ${canonical || "none"}`);

  if (route.sha256) {
    const digest = crypto.createHash("sha256").update(content).digest("hex");
    record(digest === route.sha256, `Protected iOS Privacy/Support content changed: ${route.file}`);
  }

  if (route.sitemap !== false) {
    record(sitemap.includes(`<loc>${route.canonical}</loc>`), `Protected canonical missing from sitemap: ${route.canonical}`);
  }
}

for (const route of inventory.toolShellRoutes || []) {
  const absolutePath = path.join(root, route.file);
  record(fs.existsSync(absolutePath), `Missing Web Tool shell: ${route.file}`);
  if (!fs.existsSync(absolutePath)) continue;

  const content = fs.readFileSync(absolutePath, "utf8");
  const canonical = content.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
  record(canonical === route.canonical, `Canonical mismatch in ${route.file}: expected ${route.canonical}, found ${canonical || "none"}`);
  if (route.complete) {
    record(/<meta\s+name=["']robots["']\s+content=["']index,follow["']/i.test(content), `Completed Web Tool must be indexable: ${route.file}`);
    record(/<input\b[^>]*type=["']file["']/i.test(content), `Completed Web Tool must expose an accessible file input: ${route.file}`);
    record(sitemap.includes(`<loc>${route.canonical}</loc>`), `Completed Web Tool missing from sitemap: ${route.canonical}`);
  } else {
    record(/<meta\s+name=["']robots["']\s+content=["']noindex,follow["']/i.test(content), `Incomplete Web Tool shell must remain noindex: ${route.file}`);
    record(!/<input\b/i.test(content), `Incomplete Web Tool shell must not expose a file input: ${route.file}`);
  }
}

for (const file of inventory.requiredFiles) {
  record(fs.existsSync(path.join(root, file)), `Missing protected public file: ${file}`);
}

record(fs.readFileSync(path.join(root, "CNAME"), "utf8").trim() === "coobbi.com", "CNAME must remain coobbi.com");
record(/Sitemap:\s*https:\/\/coobbi\.com\/sitemap\.xml/i.test(fs.readFileSync(path.join(root, "robots.txt"), "utf8")), "robots.txt must reference the canonical sitemap");

if (errors.length) {
  console.error(`Route regression check failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const protectedContentCount = inventory.htmlRoutes.filter((route) => route.sha256).length;
const completeToolCount = (inventory.toolShellRoutes || []).filter((route) => route.complete).length;
const shellToolCount = (inventory.toolShellRoutes || []).length - completeToolCount;
console.log(`Route regression check passed: ${inventory.htmlRoutes.length} existing HTML routes, ${protectedContentCount} immutable iOS pages, ${completeToolCount} completed tools, ${shellToolCount} noindex tool shells, and ${inventory.requiredFiles.length} public files protected.`);
