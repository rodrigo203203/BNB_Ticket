/**
 * Capturas Kanban scroll — antes (main @ 4c98876) y después (rama actual).
 * Uso: BASE=... DEMO_SEED_PASSWORD=... node scripts/capturas/capture-kanban-scroll.mjs before|after
 */
import { chromium } from '/tmp/pw-capture/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '../..');
const MODE = process.argv[2];
if (MODE !== 'before' && MODE !== 'after') {
  console.error('Uso: node capture-kanban-scroll.mjs before|after');
  process.exit(1);
}

const OUT_BEFORE = join(REPO, 'docs/capturas/kanban-scroll/before');
const OUT_AFTER = join(REPO, 'docs/capturas/kanban-scroll/after');
const OUT = MODE === 'before' ? OUT_BEFORE : OUT_AFTER;
mkdirSync(OUT, { recursive: true });

const BASE = process.env.BASE || 'http://127.0.0.1:5199';
const PASS = process.env.DEMO_SEED_PASSWORD || 'DemoBNB2026!';
const DESKTOP_WIDTHS = [1440, 1024, 768];
const METRICS = [];

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#email', { timeout: 60_000 });
  await page.fill('#email', 'admin@bnb.com.bo');
  await page.fill('#password', PASS);
  await page.locator('button.submit-button').click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 60_000 });
}

/** Métricas del contenedor .kanban-board con scroll forzado a 0 antes de medir. */
async function medirTablero(page, scrollToEnd = false) {
  return page.evaluate((toEnd) => {
    const board = document.querySelector('.kanban-board');
    if (!board) throw new Error('No .kanban-board');
    board.scrollLeft = 0;
    const overflowX = getComputedStyle(board).overflowX;
    const clientWidth = board.clientWidth;
    const scrollWidth = board.scrollWidth;
    const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);
    if (toEnd && maxScrollLeft > 0) {
      board.scrollTo({ left: maxScrollLeft, behavior: 'instant' });
    }
    const scrollLeftBeforeNudge = board.scrollLeft;
    board.scrollLeft = board.scrollLeft + 5000;
    const scrollLeftAfterNudge = board.scrollLeft;
    if (toEnd && maxScrollLeft > 0) board.scrollTo({ left: maxScrollLeft, behavior: 'instant' });
    else board.scrollLeft = 0;
    const cols = [...document.querySelectorAll('.kanban-board .kanban-column')];
    const columnTitles = cols.map((el) => {
      const h = el.querySelector('.column-title, h3, [class*="title"]');
      return (h?.textContent || el.textContent || '').trim().slice(0, 40);
    });
    const br = board.getBoundingClientRect();
    const lastCol = cols[cols.length - 1];
    const lastColumnClipped = lastCol
      ? lastCol.getBoundingClientRect().right > br.right + 2
      : false;
  const firstCol = cols[0];
  const firstVisible = firstCol ? firstCol.getBoundingClientRect().left >= br.left - 2 : true;
    return {
      clientWidth,
      scrollWidth,
      scrollLeft: board.scrollLeft,
      maxScrollLeft,
      overflowX,
      scrollWidthGtClient: scrollWidth > clientWidth,
      /** Solo referencia: overflow:hidden puede aceptar scrollLeft por script aunque el usuario no pueda desplazar. */
      programmaticScrollMoved: scrollLeftAfterNudge > scrollLeftBeforeNudge,
      lastColumnClipped,
      firstColumnVisible: firstVisible,
      columnCount: columnTitles.length,
      firstColumn: columnTitles[0] ?? '',
      lastColumn: columnTitles[columnTitles.length - 1] ?? '',
    };
  }, scrollToEnd);
}

async function irKanban(page, w, h) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`${BASE}/kanban`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.kanban-board', { timeout: 30_000 });
  await page.waitForTimeout(400);
}

async function capturar(page, w, h, filename, { reuse = false } = {}) {
  if (!reuse) await irKanban(page, w, h);
  const path = join(OUT, filename);
  await page.screenshot({ path, fullPage: false });
  console.log('saved', filename);
  return path;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page);

  if (MODE === 'before') {
    for (const w of DESKTOP_WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(`${BASE}/kanban`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.kanban-board');
      await page.evaluate(() => {
        const board = document.querySelector('.kanban-board');
        if (board) board.scrollLeft = 0;
      });
      const m = await medirTablero(page, false);
      if (w > 768) {
        if (m.overflowX !== 'hidden') {
          throw new Error(`[before@${w}] overflow-x debe ser hidden (CSS main), fue ${m.overflowX}`);
        }
        if (!m.scrollWidthGtClient) {
          throw new Error(
            `[before@${w}] se esperaba scrollWidth>clientWidth; ${m.scrollWidth} vs ${m.clientWidth}`,
          );
        }
        if (!m.lastColumnClipped) {
          throw new Error(`[before@${w}] la última columna no queda cortada (scroll en 0)`);
        }
        if (m.programmaticScrollMoved && m.scrollLeft > 0) {
          console.warn(`[before@${w}] scrollLeft programático movió (overflow:hidden); UI sigue sin scroll`);
        }
      }
      METRICS.push({ mode: 'before', width: w, position: 'inicio', ...m });
      await capturar(page, w, 900, `kanban-scroll-before@${w}.png`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/kanban`, { waitUntil: 'networkidle' });
    const m390 = await medirTablero(page, false);
    METRICS.push({ mode: 'before', width: 390, position: 'inicio', ...m390 });
    await capturar(page, 390, 844, 'kanban-scroll-before@390.png');
  } else {
    for (const w of DESKTOP_WIDTHS) {
      await irKanban(page, w, 900);
      const m0 = await medirTablero(page, false);
      METRICS.push({ mode: 'after', width: w, position: 'inicio', ...m0 });
      await capturar(page, w, 900, `kanban-scroll-after-inicio@${w}.png`, { reuse: true });

      await irKanban(page, w, 900);
      const mEnd = await medirTablero(page, true);
      if (
        w > 768 &&
        mEnd.maxScrollLeft > 8 &&
        mEnd.scrollLeft < mEnd.maxScrollLeft - 15
      ) {
        throw new Error(
          `[after-final@${w}] no llegó al scroll final (scrollLeft=${mEnd.scrollLeft}, max=${mEnd.maxScrollLeft})`,
        );
      }
      METRICS.push({ mode: 'after', width: w, position: 'final', ...mEnd });
      await capturar(page, w, 900, `kanban-scroll-after-final@${w}.png`, { reuse: true });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/kanban`, { waitUntil: 'networkidle' });
    const m390 = await medirTablero(page, false);
    const stacked = await page.evaluate(() => {
      const board = document.querySelector('.kanban-board');
      if (!board) return false;
      const cs = getComputedStyle(board);
      return cs.flexDirection === 'column';
    });
    if (!stacked) console.warn('[after@390] flex-direction no es column');
    METRICS.push({ mode: 'after', width: 390, position: 'inicio', flexColumn: stacked, ...m390 });
    await capturar(page, 390, 844, 'kanban-scroll-after-inicio@390.png');
  }

  writeFileSync(join(OUT, `metrics-${MODE}.json`), JSON.stringify(METRICS, null, 2));
  console.log('metrics', join(OUT, `metrics-${MODE}.json`));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});