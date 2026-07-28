#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const appsData = readJson("data/apps.json");
const playCache = readJson("data/play-cache.json");
const today = new Date().toISOString().slice(0, 10);

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

function write(file, content) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
}

function esc(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jsonLd(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

function play(app) {
  if (!app.packageName) return {};
  return playCache.apps?.[app.packageName] || {};
}

function icon(app) {
  return play(app).icon || `assets/icons/${app.id}.svg`;
}

function relativeIcon(app, depth = 0) {
  const value = icon(app);
  if (/^https?:\/\//.test(value)) return value;
  return `${"../".repeat(depth)}${value}`;
}

function storeUrl(app) {
  if (app.storeUrl) return app.storeUrl;
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(app.packageName)}`;
}

function storeName(app) {
  return app.storeName || "Google Play";
}

function platform(app) {
  return app.platform || "Android";
}

function storeCta(app) {
  return storeName(app) === "Google Play" ? "Get it on Google Play" : "Download on the App Store";
}

function nav(active, depth = 0) {
  const prefix = "../".repeat(depth);
  const items = [
    ["Home", "index.html", "home"],
    ["Apps", "apps.html", "apps"],
    ["Tutorials", "tutorials.html", "tutorials"],
    ["Jre4Android", "jre4android/index.html", "jre4android"],
    ["Jar File Opener", "jar-file-opener/index.html", "jar-file-opener"],
    ["Contact", "contact.html", "contact"]
  ];
  return `<header class="site-header"><div class="nav"><a class="brand" href="${prefix}index.html"><img class="site-logo" src="${prefix}assets/icons/coobbi.svg" alt="Coobbi logo"><span>Coobbi</span></a><div class="nav-links">${items.map(([label, href, key]) => `<a ${active === key ? 'class="active"' : ""} href="${prefix}${href}">${label}</a>`).join("")}</div></div></header>`;
}

function footer(depth = 0) {
  const prefix = "../".repeat(depth);
  return `<footer class="footer"><div class="footer-inner"><div>© Coobbi. Independent mobile apps and utilities.</div><div><a href="${prefix}index.html">Home</a><a href="${prefix}apps.html">Apps</a><a href="${prefix}tutorials.html">Tutorials</a><a href="${prefix}contact.html">Contact</a></div></div></footer>`;
}

function head({ title, description, canonical, image, depth = 0, structuredData = [] }) {
  const prefix = "../".repeat(depth);
  const tags = structuredData.map(jsonLd).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><link rel="icon" type="image/svg+xml" href="${prefix}assets/favicon.svg"><meta name="description" content="${esc(description)}"><link rel="canonical" href="${canonical}"><link rel="stylesheet" href="${prefix}assets/style.css">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary">
${tags}</head>`;
}

function appMeta(app) {
  const data = play(app);
  const rows = [
    data.rating ? `★ ${esc(data.rating)}` : "",
    data.installs ? esc(data.installs) : "",
    data.updated ? `Updated ${esc(data.updated)}` : ""
  ].filter(Boolean);
  if (!rows.length) return "";
  return `<div class="app-meta">${rows.map((row) => `<span>${row}</span>`).join("")}</div>`;
}

function appCard(app, depth = 0) {
  const prefix = "../".repeat(depth);
  return `<article class="card app-card"><img class="app-icon" src="${esc(relativeIcon(app, depth))}" alt="${esc(app.name)} icon"><h3>${esc(app.name)}</h3><p>${esc(app.shortDescription)}</p>${appMeta(app)}<div class="card-actions"><a class="card-link" href="${prefix}${app.slug}/index.html">Learn more</a><a class="card-link store" href="${storeUrl(app)}">${esc(storeName(app))}</a></div></article>`;
}

function sb3Block(depth = 0) {
  const sb3Apps = appsData.apps.filter((app) => ["sb3-game-player", "sb3-file-opener"].includes(app.id));
  return `<section class="container sb3-platforms"><div class="section-head"><div><span class="kicker light">SB3 Players</span><h2>Open and play SB3 files on mobile</h2><p>Choose the version for your device. Both apps are designed for Scratch-compatible .sb3 project files.</p></div><a class="btn blue" href="${"../".repeat(depth)}tutorials.html">SB3 tutorials</a></div><div class="grid featured">${sb3Apps.map((app) => appCard(app, depth)).join("")}</div></section>`;
}

function homePage() {
  const apps = appsData.apps;
  const featured = apps.filter((app) => app.featured);
  const fileTools = apps.filter((app) => app.category === "File Tools");
  const structuredData = [{
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": appsData.site.name,
    "url": appsData.site.url,
    "sameAs": [appsData.site.playDeveloperUrl, ...apps.filter((app) => app.storeName === "App Store").map(storeUrl)]
  }];
  const heroCards = featured.slice(0, 3).map((app) => `<div class="hero-card"><strong><img class="hero-app-icon" src="${esc(relativeIcon(app))}" alt="${esc(app.name)} icon">${esc(app.name)}</strong><span>${esc(app.shortDescription)}</span></div>`).join("");
  return `${head({ title: "Coobbi Apps - iOS and Android File & Utility Tools", description: appsData.site.description, canonical: `${appsData.site.url}/`, image: "assets/icons/coobbi.svg", structuredData })}<body>${nav("home")}
<section class="hero"><div class="hero-inner"><div><span class="kicker">iOS & Android apps by Coobbi</span><h1>Useful mobile apps for files, projects and developer tools.</h1><p>Play SB3 projects on iPhone and iPad, inspect JAR files, run Java apps on Android, and use focused file, network and server utilities.</p><div class="hero-actions"><a class="btn primary" href="apps.html">Explore Apps</a><a class="btn secondary" href="tutorials.html">Read Tutorials</a></div><div class="trust-row"><div class="trust-item"><strong>iPhone & iPad</strong><span>SB3 Player and JAR Viewer</span></div><div class="trust-item"><strong>${fileTools.length} File Tools</strong><span>JAR, DAT, OBB, SO</span></div><div class="trust-item"><strong>${apps.length} Mobile Apps</strong><span>iOS and Android utilities</span></div></div></div><div class="hero-panel">${heroCards}</div></div></section>
<main>${sb3Block()}<section class="container"><div class="section-head"><div><h2>Featured Apps</h2><p>Start with Coobbi's core mobile tools for projects, Java apps, file inspection and network control.</p></div><a class="btn blue" href="apps.html">All apps</a></div><div class="grid featured">${featured.map((app) => appCard(app)).join("")}</div></section><section class="container"><div class="section-head"><div><h2>File Tools</h2><p>Dedicated mobile file opener apps for SB3, JAR, DAT, OBB and native SO libraries.</p></div></div><div class="grid apps">${fileTools.map((app) => appCard(app)).join("")}</div></section>${tutorialBlock()}<section class="container"><div class="cta"><div><h2>Build your mobile utility workflow with Coobbi.</h2><p>Play projects, inspect files, run Java and use focused network and server tools.</p></div><a class="btn primary" href="apps.html">View all apps</a></div></section></main>${footer()}</body></html>`;
}

function tutorialBlock(depth = 0) {
  const prefix = "../".repeat(depth);
  const tutorials = [
    ["sb3-game-player/open-sb3-files-on-iphone-ipad.html", "Open Scratch SB3 Files on iPhone & iPad", "Import and play an .sb3 project on iOS or iPadOS."],
    ["sb3-file-opener/open-sb3-files-on-android.html", "Open Scratch SB3 Files on Android", "Import and play an .sb3 project on an Android phone or tablet."],
    ["jre4android/run-jar-files-on-android.html", "How to Run JAR Files on Android", "Use Jre4Android to run compatible Java JAR apps directly on Android."],
    ["jre4android/java-swing-on-android.html", "Run Java Swing Apps on Android", "Launch desktop-style Java Swing GUI apps with touch, zoom and virtual mouse controls."],
    ["jre4android/run-class-files-on-android.html", "How to Run .class Files on Android", "Run compiled Java CLASS files from your Android device."],
    ["jre4android/j2me-emulator-android.html", "J2ME Emulator for Android", "Run classic Java ME apps and games on Android."],
    ["jar-file-opener/open-jar-files-on-android.html", "How to Open JAR Files on Android", "Open, browse and inspect Java JAR archives on Android."],
    ["jar-file-opener/view-manifest-mf.html", "How to View MANIFEST.MF", "Check Main-Class, Manifest-Version and other JAR metadata."]
  ];
  return `<section class="container"><div class="section-head"><div><h2>Popular Tutorials</h2><p>Guides that help users solve common Android file and Java tasks.</p></div><a class="btn blue" href="${prefix}tutorials.html">All tutorials</a></div><div class="grid tutorials">${tutorials.map(([href, title, description]) => `<a class="card tutorial-card" href="${prefix}${href}"><strong>${esc(title)}</strong>${esc(description)}</a>`).join("")}</div></section>`;
}

function appsPage() {
  const groups = [...new Set(appsData.apps.map((app) => app.category))];
  const sb3Ids = new Set(["sb3-game-player", "sb3-file-opener"]);
  const structuredData = [{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Coobbi Mobile Apps",
    "url": `${appsData.site.url}/apps.html`,
    "description": "Browse Coobbi apps for iPhone, iPad and Android."
  }];
  return `${head({ title: "Coobbi Apps for iPhone, iPad and Android", description: "Browse Coobbi mobile apps including SB3 Game Player, SB3 File Opener & Player, JarInspector, Java tools, Android file openers, network utilities and server tools.", canonical: `${appsData.site.url}/apps.html`, image: "assets/icons/coobbi.svg", structuredData })}<body>${nav("apps")}<section class="page-hero"><div class="container"><h1>Coobbi Mobile Apps</h1><p>Browse Coobbi apps for iPhone, iPad and Android, grouped by the task they help you finish.</p><div class="hero-actions"><a class="btn primary" href="${appsData.site.playDeveloperUrl}">View Android Apps</a></div></div></section><main>${sb3Block()}${groups.map((group) => { const groupApps = appsData.apps.filter((app) => app.category === group && !sb3Ids.has(app.id)); return groupApps.length ? `<section class="container"><div class="section-head"><div><h2>${esc(group)}</h2><p>${esc(groupIntro(group))}</p></div></div><div class="grid apps">${groupApps.map((app) => appCard(app)).join("")}</div></section>` : ""; }).join("")}</main>${footer()}</body></html>`;
}

function groupIntro(group) {
  return {
    "Java Tools": "Run Java programs, JAR files, CLASS files and J2ME apps on Android.",
    "File Tools": "Open, inspect and extract specialized Android and Java-related file formats.",
    "Network Tools": "Monitor traffic and control app network access from Android.",
    "Server Tools": "Run or manage Minecraft Java Edition server workflows on Android.",
    "Utility Tools": "Small Android tools for everyday device control and productivity.",
    "iPhone & iPad Apps": "Open and play specialized project and archive file formats locally on iOS and iPadOS."
  }[group] || `Coobbi apps for ${group.toLowerCase()}.`;
}

function appPage(app) {
  const data = play(app);
  const screenshots = (data.screenshots || []).slice(0, 6);
  const structuredData = [{
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    "name": app.name,
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": platform(app),
    "description": app.seoDescription,
    "url": `${appsData.site.url}/${app.slug}/`,
    "image": relativeIcon(app, 1),
    "sameAs": storeUrl(app),
    "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}
  }];
  if (data.rating && data.ratingCount) {
    structuredData[0].aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": data.rating,
      "ratingCount": data.ratingCount
    };
  }
  const policyLinks = app.supportUrl || app.privacyUrl ? `<section class="card"><h2>Support & Privacy</h2>${app.supportUrl ? `<p><a href="${esc(app.supportUrl)}">Support for ${esc(app.name)}</a></p>` : ""}${app.privacyUrl ? `<p><a href="${esc(app.privacyUrl)}">Privacy Policy</a></p>` : ""}</section>` : "";
  return `${head({ title: `${app.title} - Coobbi`, description: app.seoDescription, canonical: `${appsData.site.url}/${app.slug}/`, image: relativeIcon(app, 1), depth: 1, structuredData })}<body>${nav("apps", 1)}<section class="page-hero app-hero"><div class="container"><img class="app-icon hero-page-icon" src="${esc(relativeIcon(app, 1))}" alt="${esc(app.name)} icon"><h1>${esc(app.title)}</h1><p>${esc(app.shortDescription)}</p>${appMeta(app)}<div class="hero-actions"><a class="btn primary" href="${storeUrl(app)}">${esc(storeCta(app))}</a><a class="btn secondary" href="../apps.html">More Coobbi Apps</a></div></div></section><main class="container app-detail"><section class="card"><h2>About ${esc(app.name)}</h2><p>${esc(app.seoDescription)}</p>${data.description ? `<p>${esc(data.description)}</p>` : ""}</section><section class="card"><h2>Key Features</h2><ul>${app.features.map((feature) => `<li>${esc(feature)}</li>`).join("")}</ul></section>${screenshots.length ? `<section class="card"><h2>Screenshots</h2><div class="screenshot-strip">${screenshots.map((src) => `<img src="${esc(src)}" alt="${esc(app.name)} screenshot">`).join("")}</div></section>` : ""}${app.tutorials.length ? `<section class="card"><h2>Tutorials</h2><div class="grid tutorials">${app.tutorials.map((tutorial) => `<a class="card tutorial-card" href="${esc(tutorial.href)}"><strong>${esc(tutorial.title)}</strong>${esc(tutorial.description)}</a>`).join("")}</div></section>` : ""}${(app.extraSections || []).map(extraSection).join("")}${policyLinks}<section class="card"><h2>Download ${esc(app.name)}</h2><p>Get ${esc(app.name)} from ${esc(storeName(app))}.</p><a class="btn blue" href="${storeUrl(app)}">${esc(storeCta(app))}</a></section></main>${footer(1)}</body></html>`;
}

function extraSection(section) {
  return `<section class="card"${section.id ? ` id="${esc(section.id)}"` : ""}><h2>${esc(section.title)}</h2><p>${esc(section.body)}</p>${section.link ? `<p><a href="${esc(section.link.href)}">${esc(section.link.text)}</a></p>` : ""}</section>`;
}

function sitemap() {
  const staticPages = ["", "apps.html", "tutorials.html", "contact.html"];
  const appPages = appsData.apps.map((app) => `${app.slug}/`);
  const tutorialPages = [
    "jre4android/run-jar-files-on-android.html",
    "jre4android/java-swing-on-android.html",
    "jre4android/run-class-files-on-android.html",
    "jre4android/j2me-emulator-android.html",
    "jar-file-opener/open-jar-files-on-android.html",
    "jar-file-opener/view-manifest-mf.html",
    "jar-file-opener/decompile-class-files.html",
    "jar-file-opener/extract-jar-files.html",
    "so-file-viewer/check-android-16kb-page-size.html",
    "obb-file-opener/open-obb-files-on-android.html",
    "dat-file-opener/open-dat-files-on-android.html",
    "sb3-file-opener/open-sb3-files-on-android.html",
    "sb3-game-player/open-sb3-files-on-iphone-ipad.html"
  ];
  const auxiliaryPages = appsData.apps.flatMap((app) => [app.supportUrl, app.privacyUrl].filter(Boolean).map((page) => `${app.slug}/${page}`));
  const urls = [...staticPages, ...appPages, ...tutorialPages, ...auxiliaryPages];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url, index) => `<url><loc>${appsData.site.url}/${url}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${index === 0 ? "1.0" : "0.8"}</priority></url>`).join("\n")}\n</urlset>\n`;
}

write("index.html", homePage());
write("apps.html", appsPage());
for (const app of appsData.apps) {
  write(`${app.slug}/index.html`, appPage(app));
}
write("sitemap.xml", sitemap());

console.log(`Built ${appsData.apps.length} app pages, index.html, apps.html and sitemap.xml.`);
