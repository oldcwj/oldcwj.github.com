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
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(app.packageName)}`;
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
  return `<footer class="footer"><div class="footer-inner"><div>© Coobbi. Independent Android tools.</div><div><a href="${prefix}index.html">Home</a><a href="${prefix}apps.html">Apps</a><a href="${prefix}tutorials.html">Tutorials</a><a href="${prefix}contact.html">Contact</a></div></div></footer>`;
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
  return `<article class="card app-card"><img class="app-icon" src="${esc(relativeIcon(app, depth))}" alt="${esc(app.name)} icon"><h3>${esc(app.name)}</h3><p>${esc(app.shortDescription)}</p>${appMeta(app)}<div class="card-actions"><a class="card-link" href="${prefix}${app.slug}/index.html">Learn more</a><a class="card-link store" href="${storeUrl(app)}">Google Play</a></div></article>`;
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
    "sameAs": [appsData.site.playDeveloperUrl]
  }];
  const heroCards = featured.slice(0, 3).map((app) => `<div class="hero-card"><strong><img class="hero-app-icon" src="${esc(relativeIcon(app))}" alt="${esc(app.name)} icon">${esc(app.name)}</strong><span>${esc(app.shortDescription)}</span></div>`).join("");
  return `${head({ title: "Coobbi Tools - Android File, Java and Network Utilities", description: appsData.site.description, canonical: `${appsData.site.url}/`, image: "assets/icons/coobbi.svg", structuredData })}<body>${nav("home")}
<section class="hero"><div class="hero-inner"><div><span class="kicker">Android tools by Coobbi</span><h1>Useful Android tools for files, Java apps and network control.</h1><p>Open special file formats, run Java apps on Android, inspect native libraries, monitor app connections and manage server utilities with lightweight Coobbi apps.</p><div class="hero-actions"><a class="btn primary" href="apps.html">Explore Apps</a><a class="btn secondary" href="tutorials.html">Read Tutorials</a></div><div class="trust-row"><div class="trust-item"><strong>${fileTools.length} File Tools</strong><span>JAR, DAT, OBB, SO</span></div><div class="trust-item"><strong>Java Runtime</strong><span>JAR, CLASS, Swing, J2ME</span></div><div class="trust-item"><strong>${apps.length} Android Apps</strong><span>Network, server and utility tools</span></div></div></div><div class="hero-panel">${heroCards}</div></div></section>
<main><section class="container"><div class="section-head"><div><h2>Featured Apps</h2><p>Start with Coobbi's core Android tools for Java apps, file inspection and network control.</p></div><a class="btn blue" href="apps.html">All apps</a></div><div class="grid featured">${featured.map((app) => appCard(app)).join("")}</div></section><section class="container"><div class="section-head"><div><h2>File Tools</h2><p>Dedicated Android file opener apps for JAR, DAT, OBB and native SO libraries.</p></div></div><div class="grid apps">${fileTools.map((app) => appCard(app)).join("")}</div></section>${tutorialBlock()}<section class="container"><div class="cta"><div><h2>Build your Android utility workflow with Coobbi Tools.</h2><p>Use one tool to inspect files, another to run Java, and more tools for network monitoring and server management.</p></div><a class="btn primary" href="apps.html">View all apps</a></div></section></main>${footer()}</body></html>`;
}

function tutorialBlock(depth = 0) {
  const prefix = "../".repeat(depth);
  const tutorials = [
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
  const structuredData = [{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Coobbi Android Apps",
    "url": `${appsData.site.url}/apps.html`,
    "description": "Browse all Coobbi Android apps available on Google Play."
  }];
  return `${head({ title: "Coobbi Android Apps - File, Java and Network Tools", description: "Browse Coobbi Android apps including Java tools, Android file openers, network utilities, Minecraft server tools and Bluetooth utilities.", canonical: `${appsData.site.url}/apps.html`, image: "assets/icons/coobbi.svg", structuredData })}<body>${nav("apps")}<section class="page-hero"><div class="container"><h1>Coobbi Android Apps</h1><p>Browse all Coobbi apps available on Google Play, grouped by the task they help you finish.</p><div class="hero-actions"><a class="btn primary" href="${appsData.site.playDeveloperUrl}">View Developer Page</a></div></div></section><main>${groups.map((group) => `<section class="container"><div class="section-head"><div><h2>${esc(group)}</h2><p>${esc(groupIntro(group))}</p></div></div><div class="grid apps">${appsData.apps.filter((app) => app.category === group).map((app) => appCard(app)).join("")}</div></section>`).join("")}</main>${footer()}</body></html>`;
}

function groupIntro(group) {
  return {
    "Java Tools": "Run Java programs, JAR files, CLASS files and J2ME apps on Android.",
    "File Tools": "Open, inspect and extract specialized Android and Java-related file formats.",
    "Network Tools": "Monitor traffic and control app network access from Android.",
    "Server Tools": "Run or manage Minecraft Java Edition server workflows on Android.",
    "Utility Tools": "Small Android tools for everyday device control and productivity."
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
    "operatingSystem": "Android",
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
  return `${head({ title: `${app.title} - Coobbi`, description: app.seoDescription, canonical: `${appsData.site.url}/${app.slug}/`, image: relativeIcon(app, 1), depth: 1, structuredData })}<body>${nav("apps", 1)}<section class="page-hero app-hero"><div class="container"><img class="app-icon hero-page-icon" src="${esc(relativeIcon(app, 1))}" alt="${esc(app.name)} icon"><h1>${esc(app.title)}</h1><p>${esc(app.shortDescription)}</p>${appMeta(app)}<div class="hero-actions"><a class="btn primary" href="${storeUrl(app)}">Download on Google Play</a><a class="btn secondary" href="../apps.html">More Coobbi Apps</a></div></div></section><main class="container app-detail"><section class="card"><h2>About ${esc(app.name)}</h2><p>${esc(app.seoDescription)}</p>${data.description ? `<p>${esc(data.description)}</p>` : ""}</section><section class="card"><h2>Key Features</h2><ul>${app.features.map((feature) => `<li>${esc(feature)}</li>`).join("")}</ul></section>${screenshots.length ? `<section class="card"><h2>Screenshots</h2><div class="screenshot-strip">${screenshots.map((src) => `<img src="${esc(src)}" alt="${esc(app.name)} screenshot">`).join("")}</div></section>` : ""}${app.tutorials.length ? `<section class="card"><h2>Tutorials</h2><div class="grid tutorials">${app.tutorials.map((tutorial) => `<a class="card tutorial-card" href="${esc(tutorial.href)}"><strong>${esc(tutorial.title)}</strong>${esc(tutorial.description)}</a>`).join("")}</div></section>` : ""}${(app.extraSections || []).map(extraSection).join("")}<section class="card"><h2>Download ${esc(app.name)}</h2><p>Get ${esc(app.name)} from Google Play.</p><a class="btn blue" href="${storeUrl(app)}">Download on Google Play</a></section></main>${footer(1)}</body></html>`;
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
    "dat-file-opener/open-dat-files-on-android.html"
  ];
  const urls = [...staticPages, ...appPages, ...tutorialPages];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url, index) => `<url><loc>${appsData.site.url}/${url}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${index === 0 ? "1.0" : "0.8"}</priority></url>`).join("\n")}\n</urlset>\n`;
}

write("index.html", homePage());
write("apps.html", appsPage());
for (const app of appsData.apps) {
  write(`${app.slug}/index.html`, appPage(app));
}
write("sitemap.xml", sitemap());

console.log(`Built ${appsData.apps.length} app pages, index.html, apps.html and sitemap.xml.`);
