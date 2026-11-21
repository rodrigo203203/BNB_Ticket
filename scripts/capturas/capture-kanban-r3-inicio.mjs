/**
 * Capturas R3: solo inicio @1440 y @1024 (degradado 40px + cabecera).
 */
import { chromium } from '/tmp/pw-capture/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(REPO, 'docs/capturas/kanban-scroll/r3');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:5199';
const PASS = process.env.DEMO_SEED_PASSWORD || 'DemoBNB2026!';

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email', { timeout: 60_000 });
  await page.fill('#email', 'admin@bnb.com.bo');
  await page.fill('#password', PASS);
  await page.locator('button.submit-button').click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 60_000 });
}

async function shot(page, w, name) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(`${BASE}/kanban`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.kanban-board');
  await page.evaluate(() => {
    const b = document.querySelector('.kanban-board');
    if (b) b.scrollLeft = 0;
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, name) });
  console.log('saved', name);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await login(page);
await shot(page, 1440, 'kanban-r2-inicio@1440.png');
await shot(page, 1024, 'kanban-r2-inicio@1024.png');
await browser.close();