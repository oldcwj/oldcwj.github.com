const appsGrid = document.getElementById('apps-grid');
const yearEl = document.getElementById('year');
const langToggle = document.getElementById('lang-toggle');

const i18n = {
  en: {
    heroTitle: 'Build better daily experiences with Coobbi apps',
    heroSubtitle:
      'This is the official Coobbi website. Browse apps published on Google Play and open each listing directly.',
    heroPrimaryCta: 'Visit Google Play Developer Page',
    heroSecondaryCta: 'View Apps',
    appsTitle: 'Apps',
    appsSubtitle: 'The list below is synced from Google Play developer data.',
    groupJar: 'Java & JAR Apps',
    groupMinecraft: 'Minecraft Apps',
    groupFileTools: 'File Utility Apps',
    groupOther: 'Other Apps',
    aboutTitle: 'About Coobbi',
    aboutBody:
      'Coobbi focuses on practical Android tools. This site is the official landing page for product updates, branding, and download guidance.',
    fallbackCategory: 'Android App',
    fallbackDescription: 'See details on Google Play.',
    goPlay: 'Open on Google Play',
    emptyApps: 'No apps to display yet.',
    loadError: 'Failed to load app data. Please try again later, or visit the Google Play developer page directly.',
    switchLabel: '中文'
  },
  zh: {
    heroTitle: '为你的每一天，打造更简单的 App 体验',
    heroSubtitle: '这是 Coobbi 的官方应用站点，展示你在 Google Play 发布的产品。',
    heroPrimaryCta: '访问 Google Play 开发者主页',
    heroSecondaryCta: '查看应用',
    appsTitle: '应用列表',
    appsSubtitle: '以下应用由 Google Play 开发者数据自动同步生成。',
    groupJar: 'Java / JAR 应用',
    groupMinecraft: 'Minecraft 应用',
    groupFileTools: '文件工具应用',
    groupOther: '其他应用',
    aboutTitle: '关于 Coobbi',
    aboutBody: 'Coobbi 专注于实用 Android 工具。本网站用于统一介绍产品、品牌信息和下载入口。',
    fallbackCategory: 'Android 应用',
    fallbackDescription: '欢迎在 Google Play 查看详情。',
    goPlay: '前往 Google Play',
    emptyApps: '暂时没有可展示的应用。',
    loadError: '应用数据加载失败，请稍后重试，或直接访问 Google Play 开发者主页。',
    switchLabel: 'EN'
  }
};

let currentLang = localStorage.getItem('lang') || 'en';
let appsData = [];

yearEl.textContent = new Date().getFullYear();

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = i18n[lang][key];
  });

  langToggle.textContent = i18n[lang].switchLabel;
  renderApps(appsData);
}

function appText(app, key) {
  if (currentLang === 'zh') {
    return app[`${key}Zh`] || app[key] || '';
  }
  return app[`${key}En`] || app[key] || '';
}

function toShortText(raw, maxLength = 60) {
  const text = String(raw || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return '';

  const firstSentence = text.split(/(?<=[.!?。！？])\s+/)[0] || text;
  const shortText = firstSentence.length > maxLength ? firstSentence.slice(0, maxLength) : firstSentence;

  return `${shortText.trimEnd()}${firstSentence.length > maxLength ? '…' : ''}`;
}

function getAppGroupKey(app) {
  const name = (app.nameEn || app.name || '').toLowerCase();
  if (name.includes('jre4android') || name.includes('jar file opener')) return 'groupJar';
  if (name.includes('minecraft server') || name.includes('minecraft rcon admin')) return 'groupMinecraft';
  if (name.includes('obb file opener') || name.includes('dat file opener') || name.includes('so file viewer')) {
    return 'groupFileTools';
  }
  return 'groupOther';
}

function renderGroupSection(groupLabel, apps) {
  if (!apps.length) return '';
  return `
    <section class="app-group">
      <h3 class="app-group-title">${groupLabel}</h3>
      <div class="apps-grid">
        ${apps
          .map((app) => {
            const name = appText(app, 'name');
            const category = appText(app, 'category') || i18n[currentLang].fallbackCategory;
            const description = toShortText(appText(app, 'description') || i18n[currentLang].fallbackDescription);
            const updated = app.updatedAt ? ` · ${app.updatedAt}` : '';

            return `
              <article class="card">
                <div class="card-header">
                  <img src="${app.icon}" alt="${name} icon" loading="lazy" />
                  <div>
                    <h3>${name}</h3>
                    <p>${category}${updated}</p>
                  </div>
                </div>
                <p class="card-description">${description}</p>
                <a class="btn primary card-cta" href="${app.url}" target="_blank" rel="noopener noreferrer">${i18n[currentLang].goPlay}</a>
              </article>
            `;
          })
          .join('')}
      </div>
    </section>
  `;
}

function renderApps(apps) {
  if (!Array.isArray(apps) || apps.length === 0) {
    appsGrid.innerHTML = `<p>${i18n[currentLang].emptyApps}</p>`;
    return;
  }

  const groupedApps = {
    groupJar: [],
    groupMinecraft: [],
    groupFileTools: [],
    groupOther: []
  };
  apps.forEach((app) => groupedApps[getAppGroupKey(app)].push(app));

  appsGrid.innerHTML = ['groupJar', 'groupMinecraft', 'groupFileTools', 'groupOther']
    .map((groupKey) => renderGroupSection(i18n[currentLang][groupKey], groupedApps[groupKey]))
    .join('');
}

async function loadApps() {
  try {
    const response = await fetch('./apps.json');
    if (!response.ok) throw new Error('fetch failed');

    appsData = await response.json();
    renderApps(appsData);
  } catch (error) {
    appsGrid.innerHTML = `<p>${i18n[currentLang].loadError}</p>`;
    console.error(error);
  }
}

langToggle.addEventListener('click', () => {
  setLanguage(currentLang === 'en' ? 'zh' : 'en');
});

setLanguage(currentLang === 'zh' ? 'zh' : 'en');
loadApps();
