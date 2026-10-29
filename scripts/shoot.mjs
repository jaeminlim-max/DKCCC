// 모든 페이지를 360/390/430px, 라이트·다크로 찍는다. 미리 `npm run build && npm run preview`.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.env.BASE ?? 'http://localhost:4173/';
const pages = (process.env.PAGES ?? ',confess/,homework/,prayer-list/,response-chart/,pledge/,staff/').split(',');
const widths = (process.env.WIDTHS ?? '360,390,430').split(',').map(Number);
const schemes = (process.env.SCHEMES ?? 'light,dark').split(',');
const out = process.env.OUT ?? 'shots';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const scheme of schemes) {
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 1, colorScheme: scheme, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    for (const p of pages) {
      await page.goto(BASE + p, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      const name = `${out}/${(p.replace(/\/$/, '') || 'home')}-${w}-${scheme}`;
      await page.screenshot({ path: `${name}-fold.png` }); // 첫 화면 (하단 고정 버튼 포함)
      await page.evaluate(() => document.querySelectorAll('.bottom-bar').forEach((b) => (b.style.display = 'none')));
      await page.screenshot({ path: `${name}-full.png`, fullPage: true });
    }
    await ctx.close();
  }
}
await browser.close();
console.log('done');
