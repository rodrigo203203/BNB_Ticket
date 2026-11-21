/**
 * Capturas Spark R2 — Kanban K5.
 * Uso: BASE=... DEMO_SEED_PASSWORD=... node scripts/capturas/capture-kanban-r2.mjs
 */
import { chromium } from '/tmp/pw-capture/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '../..');
const OUT = join(REPO, 'docs/capturas/kanban-scroll/r2');
mkdirSync(OUT, { recursive: true });

const BASE = process.env.BASE || 'http://127.0.0.1:5199';
const PASS = process.env.DEMO_SEED_PASSWORD || 'DemoBNB2026!';
const METRICS = [];

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email', { timeout: 60_000 });
  await page.fill('#email', 'admin@bnb.com.bo');
  await page.fill('#password', PASS);
  await page.locator('button.submit-button').click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 60_000 });
}

async function irKanban(page, w, h) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`${BASE}/kanban`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.kanban-board', { timeout: 30_000 });
  await page.waitForTimeout(500);
}

async function medirTablero(page, scrollFinal = false) {
  return page.evaluate((toEnd) => {
    const board = document.querySelector('.kanban-board');
    if (!board) throw new Error('Sin .kanban-board');
    board.scrollLeft = 0;
    if (toEnd) {
      const max = Math.max(0, board.scrollWidth - board.clientWidth);
      board.scrollLeft = max;
    }
    const br = board.getBoundingClientRect();
    const cols = [...document.querySelectorAll('.kanban-board .kanban-column')].map((el) => {
      const r = el.getBoundingClientRect();
      const visible =
        r.right > br.left + 2 && r.left < br.right - 2 && r.bottom > br.top && r.top < br.bottom;
      return {
        width: Math.round(r.width),
        left: Math.round(r.left - br.left),
        visible,
        label: el.querySelector('.col-name')?.textContent?.trim() ?? '',
      };
    });
    const scrollbarInViewport = br.bottom <= window.innerHeight && br.top >= 0;
    return {
      clientWidth: board.clientWidth,
      scrollWidth: board.scrollWidth,
      scrollLeft: board.scrollLeft,
      maxScrollLeft: Math.max(0, board.scrollWidth - board.clientWidth),
      columnWidths: cols.map((c) => c.width),
      columnasVisibles: cols.filter((c) => c.visible).length,
      columnas: cols,
      scrollbarEnVentana: scrollbarInViewport,
      boardBottom: Math.round(br.bottom),
      viewportHeight: window.innerHeight,
    };
  }, scrollFinal);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page);

  for (const w of [1440, 1024]) {
    await irKanban(page, w, 900);
    await page.evaluate(() => {
      const board = document.querySelector('.kanban-board');
      if (board) board.scrollLeft = 0;
    });
    const m0 = await medirTablero(page, false);
    METRICS.push({ archivo: `kanban-r2-inicio@${w}`, width: w, ...m0 });
    await page.screenshot({ path: join(OUT, `kanban-r2-inicio@${w}.png`) });
    console.log('saved', `kanban-r2-inicio@${w}.png`);

    await irKanban(page, w, 900);
    const mEnd = await medirTablero(page, true);
    METRICS.push({ archivo: `kanban-r2-final@${w}`, width: w, ...mEnd });
    await page.screenshot({ path: join(OUT, `kanban-r2-final@${w}.png`) });
    console.log('saved', `kanban-r2-final@${w}.png`);

    await irKanban(page, w, 900);
    await page.screenshot({ path: join(OUT, `kanban-r2-full@${w}.png`), fullPage: true });
    console.log('saved', `kanban-r2-full@${w}.png`);
  }

  await irKanban(page, 1440, 900);
  const handle = page.locator('.kanban-column').first().locator('.kanban-card.is-draggable, .kanban-card').first().locator('.drag-handle');
  const boardBox = await page.locator('.kanban-board').boundingBox();
  if (boardBox && (await handle.count()) > 0) {
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(boardBox.x + boardBox.width - 20, boardBox.y + boardBox.height / 2, { steps: 25 });
    await page.waitForTimeout(400);
    const mDrag = await medirTablero(page, false);
    METRICS.push({ archivo: 'kanban-r2-arrastre@1440', width: 1440, ...mDrag });
    await page.screenshot({ path: join(OUT, 'kanban-r2-arrastre@1440.png') });
    console.log('saved', 'kanban-r2-arrastre@1440.png');
    await page.mouse.up();
  }

  for (const w of [768, 390]) {
    await irKanban(page, w, w === 390 ? 844 : 900);
    const m = await medirTablero(page, false);
    METRICS.push({ archivo: `kanban-r2@${w}`, width: w, ...m });
    await page.screenshot({ path: join(OUT, `kanban-r2@${w}.png`) });
    console.log('saved', `kanban-r2@${w}.png`);
  }

  writeFileSync(join(OUT, 'metrics-r2.json'), JSON.stringify(METRICS, null, 2));
  console.log('metrics', join(OUT, 'metrics-r2.json'));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});