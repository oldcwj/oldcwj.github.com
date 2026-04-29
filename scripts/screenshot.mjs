import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const port = Number(process.env.PORT || 4173);
const width = Number(process.env.SCREENSHOT_WIDTH || 1440);
const height = Number(process.env.SCREENSHOT_HEIGHT || 1080);
const output = process.env.SCREENSHOT_PATH || path.join(rootDir, 'screenshot-home.png');
const targetPath = process.env.SCREENSHOT_URL_PATH || '/';

const server = spawn(process.execPath, [path.join(__dirname, 'preview.mjs')], {
  cwd: rootDir,
  env: { ...process.env, PORT: String(port) },
  stdio: 'inherit'
});

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

async function captureWithPlaywright(url) {
  try {
    const mod = await import('playwright');
    const browser = await mod.chromium.launch();
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.screenshot({ path: output, fullPage: true });
    await browser.close();
    console.log(`Saved screenshot to ${output} (playwright)`);
    return true;
  } catch {
    return false;
  }
}

async function findBrowserAndCapture() {
  const normalizedPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  const url = `http://localhost:${port}${normalizedPath}`;
  const sizeArg = `--window-size=${width},${height}`;

  if (await captureWithPlaywright(url)) return;

  const candidates = [
    ['chromium', ['--headless', '--disable-gpu', `--screenshot=${output}`, sizeArg, url]],
    ['chromium-browser', ['--headless', '--disable-gpu', `--screenshot=${output}`, sizeArg, url]],
    ['google-chrome', ['--headless', '--disable-gpu', `--screenshot=${output}`, sizeArg, url]]
  ];

  for (const [cmd, args] of candidates) {
    try {
      await runCommand(cmd, args);
      console.log(`Saved screenshot to ${output}`);
      return;
    } catch {
      // try next browser candidate
    }
  }

  throw new Error('No supported screenshot runtime found. Install Playwright or chromium/chromium-browser/google-chrome.');
}

(async () => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await findBrowserAndCapture();
  } finally {
    server.kill('SIGTERM');
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
