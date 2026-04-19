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
const fallbackIcon = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="100%" height="100%" rx="20" fill="#eef2ff"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="26" fill="#4f46e5">APP</text></svg>'
)}`;

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

function renderApps(apps) {
  if (!Array.isArray(apps) || apps.length === 0) {
    appsGrid.innerHTML = `<p>${i18n[currentLang].emptyApps}</p>`;
    return;
  }

  appsGrid.innerHTML = apps
    .map((app) => {
      const name = appText(app, 'name');
      const category = appText(app, 'category') || i18n[currentLang].fallbackCategory;
      const description = appText(app, 'description') || i18n[currentLang].fallbackDescription;
      const updated = app.updatedAt ? ` · ${app.updatedAt}` : '';

      return `
        <article class="card">
          <div class="card-header">
            <img
              src="${app.icon || ''}"
              alt="${name} icon"
              loading="lazy"
            />
            <div>
              <h3>${name}</h3>
              <p>${category}${updated}</p>
            </div>
          </div>
          <p>${description}</p>
          <a class="btn primary" href="${app.url}" target="_blank" rel="noopener noreferrer">${i18n[currentLang].goPlay}</a>
        </article>
      `;
    })
    .join('');

  appsGrid.querySelectorAll('img').forEach((img) => {
    img.addEventListener(
      'error',
      () => {
        if (img.src !== fallbackIcon) {
          img.src = fallbackIcon;
        }
      },
      { once: true }
    );
  });
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
