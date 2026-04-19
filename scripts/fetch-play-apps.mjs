import fs from 'node:fs/promises';
import gplay from 'google-play-scraper';

const developerId = process.env.PLAY_DEVELOPER_ID || '4826052335238518015';
const maxApps = 200;
const countries = (process.env.PLAY_COUNTRIES || 'us,hk,tw,jp,kr')
  .split(',')
  .map((country) => country.trim().toLowerCase())
  .filter(Boolean);
const outputPath = new URL('../apps.json', import.meta.url);

function mapByAppId(list) {
  return new Map(list.map((app) => [app.appId, app]));
}

function normalizeApp(enApp, zhApp) {
  return {
    nameEn: enApp?.title || zhApp?.title || 'Unknown App',
    nameZh: zhApp?.title || enApp?.title || '未知应用',
    categoryEn: enApp?.genre || 'Android App',
    categoryZh: zhApp?.genre || 'Android 应用',
    descriptionEn: enApp?.summary || 'See details on Google Play.',
    descriptionZh: zhApp?.summary || '欢迎在 Google Play 查看详情。',
    icon: enApp?.icon || zhApp?.icon || '',
    url: `https://play.google.com/store/apps/details?id=${enApp?.appId || zhApp?.appId}`,
    updatedAt: new Date().toISOString().slice(0, 10)
  };
}

async function fetchByLangAndCountries(lang) {
  const requests = countries.map((country) =>
    gplay.developer({
      devId: developerId,
      lang,
      country,
      num: maxApps,
      fullDetail: true
    })
  );

  const results = await Promise.allSettled(requests);
  const merged = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      merged.push(...result.value);
      return;
    }

    console.warn(`Fetch failed for lang=${lang}, country=${countries[index]}:`, result.reason?.message || result.reason);
  });

  return merged;
}

async function main() {
  const [appsEn, appsZh] = await Promise.all([fetchByLangAndCountries('en'), fetchByLangAndCountries('zh_CN')]);

  const enMap = mapByAppId(appsEn);
  const zhMap = mapByAppId(appsZh);

  const appIds = new Set([...enMap.keys(), ...zhMap.keys()]);
  const normalized = [...appIds]
    .map((appId) => normalizeApp(enMap.get(appId), zhMap.get(appId)))
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn));

  await fs.writeFile(outputPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  console.log(
    `Updated apps.json with ${normalized.length} apps from developer ${developerId} (countries: ${countries.join(', ')}).`
  );
  if (normalized.length <= 3) {
    console.warn(
      `Only ${normalized.length} app(s) were returned. If this is unexpected, verify PLAY_DEVELOPER_ID, PLAY_COUNTRIES, and app visibility on Google Play.`
    );
  }
}

main().catch((error) => {
  console.error('Failed to fetch Google Play apps:', error);
  process.exitCode = 1;
});
