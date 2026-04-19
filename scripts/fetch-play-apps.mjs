import fs from 'node:fs/promises';
import gplay from 'google-play-scraper';

const developerId = '4826052335238518015';
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

async function main() {
  const [appsEn, appsZh] = await Promise.all([
    gplay.developer({ devId: developerId, lang: 'en', country: 'us' }),
    gplay.developer({ devId: developerId, lang: 'zh_CN', country: 'us' })
  ]);

  const enMap = mapByAppId(appsEn);
  const zhMap = mapByAppId(appsZh);

  const appIds = new Set([...enMap.keys(), ...zhMap.keys()]);
  const normalized = [...appIds].map((appId) => normalizeApp(enMap.get(appId), zhMap.get(appId)));

  await fs.writeFile(outputPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  console.log(`Updated apps.json with ${normalized.length} apps from developer ${developerId}.`);
}

main().catch((error) => {
  console.error('Failed to fetch Google Play apps:', error);
  process.exitCode = 1;
});
