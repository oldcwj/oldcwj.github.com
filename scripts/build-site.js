#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const sourceRoot = path.resolve(__dirname, "..");
const outputFlag = process.argv.indexOf("--output");
const root = outputFlag >= 0 && process.argv[outputFlag + 1]
  ? path.resolve(process.argv[outputFlag + 1])
  : sourceRoot;
const appsData = readJson("data/apps.json");
const playCache = readJson("data/play-cache.json");
const today = new Date().toISOString().slice(0, 10);
const adsenseAccount = "ca-pub-8473144940140136";

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(sourceRoot, file), "utf8"));
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
  if (active === "home") {
    return `<header class="site-header home-header"><div class="nav"><a class="brand" href="${prefix}index.html"><img class="site-logo" src="${prefix}assets/icons/coobbi.svg" alt="Coobbi logo"><span>Coobbi</span></a><div class="nav-links"><a class="active" href="#web-tools">Tools</a><a href="#mobile-apps">Mobile Apps</a><a href="#guides">Guides</a><a href="${prefix}contact.html">About</a><a class="nav-cta" href="${prefix}file-inspector/index.html">Open File Inspector</a></div></div></header>`;
  }
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
  return `<footer class="footer"><div class="footer-inner"><div>© Coobbi. Independent mobile apps and utilities.</div><div><a href="${prefix}index.html">Home</a><a href="${prefix}apps.html">Apps</a><a href="${prefix}tutorials.html">Tutorials</a><a href="${prefix}contact.html">Contact</a><a href="${prefix}privacy.html">Website Privacy</a></div></div></footer>`;
}

function head({ title, description, canonical, image, depth = 0, structuredData = [] }) {
  const prefix = "../".repeat(depth);
  const tags = structuredData.map(jsonLd).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><link rel="icon" type="image/svg+xml" href="${prefix}assets/favicon.svg"><meta name="description" content="${esc(description)}"><meta name="google-adsense-account" content="${adsenseAccount}"><link rel="canonical" href="${canonical}"><link rel="stylesheet" href="${prefix}assets/style.css">
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
  const structuredData = [{
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": appsData.site.name,
    "url": appsData.site.url,
    "sameAs": [appsData.site.playDeveloperUrl, ...apps.filter((app) => app.storeName === "App Store").map(storeUrl)]
  }];
  return `${head({ title: "Coobbi File Tools and Mobile Apps", description: "Inspect files in your browser and discover Coobbi apps for iPhone, iPad and Android.", canonical: `${appsData.site.url}/`, image: "assets/icons/coobbi.svg", structuredData })}<body>${nav("home")}
<section class="home-hero"><div class="home-hero-inner"><div class="home-hero-copy"><span class="home-eyebrow">Private browser tools</span><h1>Understand any file.<br><span>Right in your browser.</span></h1><p>Identify formats, inspect bytes, extract strings and calculate hashes — locally, without uploading your files.</p><div class="home-actions"><a class="home-button primary" href="file-inspector/index.html">Inspect a file <span aria-hidden="true">→</span></a><a class="home-button secondary" href="#web-tools">Explore all tools</a></div><div class="home-assurance"><span>No upload</span><span>No install</span><span>Static analysis only</span></div></div>${inspectorPreview()}</div></section>
<main>${webToolsBlock()}${homeTrustBlock()}${homeAppsBlock(apps)}${homeGuidesBlock()}<section class="container home-final"><div class="cta"><div><span class="home-eyebrow inverse">Start with a local file</span><h2>See what is inside—without sending it anywhere.</h2><p>Choose a focused browser tool or explore Coobbi apps for mobile workflows.</p></div><a class="btn primary" href="file-inspector/index.html">Open File Inspector</a></div></section></main>${footer()}</body></html>`;
}

function inspectorPreview() {
  return `<div class="inspector-preview" aria-label="Example File Inspector result"><div class="preview-bar"><span class="preview-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>File Inspector / result</span></div><div class="preview-body"><div class="preview-file"><span class="preview-file-mark">JAR</span><div><strong>sample-project.jar</strong><small>184.2 KB</small></div><span class="preview-local">Processed locally</span></div><dl class="preview-result"><div><dt>Format</dt><dd class="accent">Java Archive (JAR)</dd></div><div><dt>Confidence</dt><dd>High · ZIP structure + manifest</dd></div><div><dt>Signature</dt><dd>50 4B 03 04</dd></div><div><dt>Entries</dt><dd>128 files</dd></div><div><dt>SHA-256</dt><dd>8f2a4ce72d60…e7284</dd></div></dl><p class="preview-status">✓ Analysis complete. Your file was not uploaded.</p></div></div>`;
}

function webToolsBlock() {
  const tools = [
    ["file-inspector/index.html", "FI", "File Inspector", "Identify unknown files from signatures, structure and extension agreement.", "primary", "Any file"],
    ["exe-inspector/index.html", "EXE", "EXE Inspector", "Inspect PE headers, architecture, sections, imports and exports.", "", "PE / EXE"],
    ["dll-inspector/index.html", "DLL", "DLL Inspector", "Analyze Windows libraries locally without loading or executing them.", "", "PE / DLL"],
    ["hex-viewer/index.html", "HX", "Hex Viewer", "Read file bytes by offset in a focused hexadecimal and ASCII view.", "", "HEX / ASCII"],
    ["strings-viewer/index.html", "ST", "Strings Viewer", "Find readable text embedded in local files with byte offsets.", "", "Text / Binary"],
    ["file-hash-calculator/index.html", "#", "Hash Calculator", "Calculate SHA-256, SHA-1 and MD5 fingerprints locally.", "", "SHA / MD5"]
  ];
  return `<section class="container web-tools-home" id="web-tools"><div class="home-section-head"><div><span class="home-eyebrow">Web tools</span><h2>Focused tools for file analysis</h2><p>Fast, private and built for real files—everything runs in your browser.</p></div><a class="home-text-link" href="file-inspector/index.html">Start with File Inspector →</a></div><div class="home-tools-grid">${tools.map(([href, mark, title, description, className, tag]) => `<a class="home-tool-card ${className}" href="${href}"><span class="home-tool-top"><span class="tool-mark" aria-hidden="true">${mark}</span><span class="home-tool-tag">${tag}</span></span><h3>${title}</h3><p>${description}</p><span class="tool-link">Open tool →</span></a>`).join("")}</div></section>`;
}

function homeTrustBlock() {
  return `<section class="home-trust"><div class="container"><div class="home-trust-grid"><article><span class="trust-symbol">01</span><strong>Local by design</strong><p>Files are processed on your device, not uploaded to Coobbi.</p></article><article><span class="trust-symbol">02</span><strong>Focused, not bloated</strong><p>Each tool does one technical job with clear, inspectable results.</p></article><article><span class="trust-symbol">03</span><strong>Safe static analysis</strong><p>Executables and libraries are inspected, never run or loaded.</p></article></div></div></section>`;
}

function homeAppsBlock(apps) {
  const appIds = ["jre4android", "jarinspector-ios", "sb3-game-player", "dll-exe-viewer"];
  const selected = appIds.map((id) => apps.find((app) => app.id === id)).filter(Boolean);
  return `<section class="home-apps" id="mobile-apps"><div class="container"><div class="home-section-head"><div><span class="home-eyebrow purple">Mobile apps</span><h2>Small apps. Useful superpowers.</h2><p>Focused utilities for unusual files, Java programs and Scratch projects.</p></div><a class="home-text-link purple" href="apps.html">Explore all ${apps.length} apps →</a></div><div class="home-app-grid">${selected.map((app, index) => `<article class="home-app-card tone-${index + 1}"><div class="home-app-card-top"><img class="app-icon" src="${esc(relativeIcon(app))}" alt="${esc(app.name)} icon"><span>${esc(platform(app))}</span></div><h3>${esc(app.name)}</h3><p>${esc(app.shortDescription)}</p><div class="home-app-actions"><a href="${app.slug}/index.html">Learn more</a><a class="store" href="${storeUrl(app)}">${esc(storeName(app))}</a></div></article>`).join("")}</div></div></section>`;
}

function homeGuidesBlock() {
  const guides = [
    ["jre4android/run-jar-files-on-android.html", "Java on Android", "How to Run JAR Files on Android", "Launch compatible Java apps with a dedicated Android runtime."],
    ["jar-file-opener/view-manifest-mf.html", "JAR inspection", "How to View MANIFEST.MF", "Find Main-Class, version and package metadata inside a JAR."],
    ["sb3-game-player/open-sb3-files-on-iphone-ipad.html", "Scratch projects", "Open SB3 Files on iPhone & iPad", "Import and play Scratch-compatible projects locally on iOS."]
  ];
  return `<section class="container home-guides" id="guides"><div class="home-section-head"><div><span class="home-eyebrow">Guides</span><h2>Practical answers for uncommon files</h2></div><a class="home-text-link" href="tutorials.html">Browse all guides →</a></div><div class="home-guide-grid">${guides.map(([href, label, title, description]) => `<a class="home-guide" href="${href}"><span>${label}</span><h3>${title}</h3><p>${description}</p><b>Read guide →</b></a>`).join("")}</div></section>`;
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

function privacyPage() {
  const title = "Website Privacy Policy - Coobbi";
  const description = "Privacy information for the Coobbi website, browser tools and Google AdSense advertising.";
  return `${head({ title, description, canonical: `${appsData.site.url}/privacy.html`, image: "assets/icons/coobbi.svg" })}<body>${nav("privacy")}<section class="page-hero"><div class="container"><h1>Website Privacy Policy</h1><p>Last updated: August 14, 2026</p></div></section><main class="container app-detail"><section class="card"><h2>Scope</h2><p>This policy applies to the Coobbi website at coobbi.com, including its informational pages and browser-based file tools. Coobbi mobile apps have separate privacy policies linked below.</p></section><section class="card"><h2>Browser-Based File Tools</h2><p>Files selected in Coobbi browser tools are processed locally in your browser. Coobbi does not receive or upload the file contents, file names, calculated hashes, extracted strings or analysis results.</p></section><section class="card"><h2>Information We May Process</h2><p>The website does not require an account. Our hosting and security providers may automatically process limited technical information such as IP address, browser type, requested pages, timestamps, referring pages and diagnostic data to deliver and protect the website.</p><p>If you contact Coobbi by email, we receive the email address, message and any information you choose to provide. We use it to respond to your request.</p></section><section class="card"><h2>Advertising and Cookies</h2><p>Coobbi may use Google AdSense to display advertising. Third-party vendors, including Google, may use cookies, web beacons, IP addresses or similar technologies to serve, personalize and measure ads. Google's advertising cookies may enable Google and its partners to serve ads based on visits to this website and other websites.</p><p>Learn how Google uses information from partner sites on <a href="https://policies.google.com/technologies/partner-sites">Google's partner sites policy page</a>. You can manage personalized advertising in <a href="https://adssettings.google.com/">Google Ads Settings</a> or review industry opt-out choices at <a href="https://www.aboutads.info/choices/">AboutAds</a>.</p></section><section class="card"><h2>Consent and Privacy Choices</h2><p>Where required, the website displays a consent message before using advertising cookies or processing personal data for personalized advertising. Visitors can consent, decline or manage available choices through that message. Browser settings can also be used to block or delete cookies, although some features may work differently.</p></section><section class="card"><h2>External Services and Links</h2><p>The website links to third-party services such as Google Play, the Apple App Store and Google services. Those services process information under their own privacy policies. Coobbi is not responsible for the privacy practices of external websites.</p></section><section class="card"><h2>Data Retention and Security</h2><p>Coobbi keeps information submitted by email only as long as reasonably necessary to respond, maintain support records and meet applicable obligations. We use reasonable safeguards, but no internet transmission or storage system can be guaranteed completely secure.</p></section><section class="card"><h2>Children's Privacy</h2><p>The website is not designed to collect personal information from children. If you believe a child has provided personal information to Coobbi, contact us so we can review and remove it where appropriate.</p></section><section class="card"><h2>Mobile App Policies</h2><p>This website policy does not replace the policies used by Coobbi mobile apps.</p><ul><li><a href="jarinspector-ios/privacy.html">JarInspector Privacy Policy</a> and <a href="jarinspector-ios/support.html">Support</a></li><li><a href="sb3-game-player/privacy.html">SB3 Game Player Privacy Policy</a> and <a href="sb3-game-player/support.html">Support</a></li></ul></section><section class="card"><h2>Changes to This Policy</h2><p>We may update this policy when the website, advertising services or legal requirements change. The updated version will be posted on this page with a revised date.</p></section><section class="card"><h2>Contact</h2><p>Questions about this website privacy policy can be sent to <a href="mailto:imzine.com@gmail.com">imzine.com@gmail.com</a>.</p></section></main>${footer()}</body></html>`;
}

function sitemap() {
  const staticPages = ["", "apps.html", "tutorials.html", "contact.html", "privacy.html", "file-inspector/", "hex-viewer/", "strings-viewer/", "file-hash-calculator/", "exe-inspector/", "dll-inspector/"];
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
write("privacy.html", privacyPage());
for (const app of appsData.apps) {
  write(`${app.slug}/index.html`, appPage(app));
}
write("sitemap.xml", sitemap());

console.log(`Built ${appsData.apps.length} app pages, index.html, apps.html, privacy.html and sitemap.xml.`);
