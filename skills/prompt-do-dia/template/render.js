import { chromium } from 'playwright-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const browser = await chromium.launch({ executablePath: CHROME_PATH });
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
await page.goto('file://' + path.join(__dirname, 'carrossel.html'));
await page.waitForTimeout(400);

const slides = await page.$$('.slide');
for (let i = 0; i < slides.length; i++) {
  const n = String(i + 1).padStart(2, '0');
  await slides[i].screenshot({ path: path.join(__dirname, 'instagram', `slide-${n}.png`) });
  console.log(`slide-${n}.png ok`);
}

await browser.close();
