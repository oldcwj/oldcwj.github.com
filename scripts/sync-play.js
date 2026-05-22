#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const appsData = JSON.parse(fs.readFileSync(path.join(root, "data/apps.json"), "utf8"));
const cachePath = path.join(root, "data/play-cache.json");
const oldCache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, "utf8")) : { apps: {} };

function clean(value) {
  return value
    ? value.replace(/\\u003d/g, "=").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim()
    : "";
}

function match(html, pattern) {
  const found = html.match(pattern);
  return found ? clean(found[1]) : "";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; CoobbiSiteBot/1.0; +https://coobbi.com/)"
      },
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function discoverDeveloperApps() {
  const html = await fetchText(`${appsData.site.playDeveloperUrl}&hl=en&gl=US`);
  return unique(
    [...html.matchAll(/\/store\/apps\/details\?id=([a-zA-Z0-9._]+)/g)]
      .map((item) => item[1])
  );
}

async function fetchApp(app) {
  const url = `https://play.google.com/store/apps/details?id=${encodeURIComponent(app.packageName)}&hl=en&gl=US`;
  const html = await fetchText(url);
  const title = match(html, /<meta property="og:title" content="([^"]+)"/);
  const description = match(html, /<meta name="description" content="([^"]+)"/);
  const icon = match(html, /<meta property="og:image" content="([^"]+)"/);
  const rating = match(html, /aria-label="Rated ([0-9.]+) stars out of five stars"/);
  const ratingCountText = match(html, /aria-label="([0-9,.]+) reviews"/);
  const installs = match(html, />([0-9,.]+\+?)<\/div><\/div><div[^>]*>Downloads</);
  const updated = match(html, />Updated on<\/div><div[^>]*><span[^>]*>([^<]+)<\/span>/);
  const screenshots = unique(
    [...html.matchAll(/"(https:\/\/play-lh\.googleusercontent\.com\/[^"]+=w\d+-h\d+[^"]*)"/g)]
      .map((item) => clean(item[1]))
      .filter((src) => src !== icon)
  ).slice(0, 8);
  return {
    title: title || app.name,
    description,
    icon,
    rating,
    ratingCount: ratingCountText ? ratingCountText.replace(/,/g, "") : "",
    installs,
    updated,
    screenshots,
    sourceUrl: url,
    fetchedAt: new Date().toISOString()
  };
}

(async () => {
  const attemptedAt = new Date().toISOString();
  const next = { ...oldCache, lastAttemptAt: attemptedAt, apps: { ...oldCache.apps } };
  let successCount = 0;
  try {
    const discoveredPackages = await discoverDeveloperApps();
    const knownPackages = new Set(appsData.apps.map((app) => app.packageName));
    const missingPackages = discoveredPackages.filter((packageName) => !knownPackages.has(packageName));
    if (missingPackages.length) {
      console.log(`Developer page has packages missing from data/apps.json: ${missingPackages.join(", ")}`);
    } else {
      console.log(`Developer page package check ok (${discoveredPackages.length} apps).`);
    }
  } catch (error) {
    console.log(`Developer page package check skipped (${error.message}).`);
  }
  for (const app of appsData.apps) {
    process.stdout.write(`Fetching ${app.packageName}... `);
    try {
      const fresh = await fetchApp(app);
      next.apps[app.packageName] = { ...(next.apps[app.packageName] || {}), ...fresh };
      successCount += 1;
      console.log("ok");
    } catch (error) {
      console.log(`kept cached data (${error.message})`);
    }
  }
  if (successCount > 0) next.updatedAt = attemptedAt;
  fs.writeFileSync(cachePath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Updated ${path.relative(root, cachePath)} with ${successCount} fresh app records.`);
})();
