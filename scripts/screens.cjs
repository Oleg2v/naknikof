/**
 * Deliverable screenshots: full pages at 390 (iPhone 13) and 1440 for /ru and /he,
 * plus the desktop scroll-story chapters. usage: node scripts/screens.cjs [baseUrl] [ru,he]
 */
const { chromium, devices } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'https://kolbassnik.kikkey.com';
const langs = (process.argv[3] || 'ru,he').split(',');
const OUT = path.join(__dirname, '..', 'docs', 'reports', 'screens');

async function full(b, lang, w) {
  const ctx = await b.newContext(w === 390 ? { ...devices['iPhone 13'], deviceScaleFactor: 2 } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto(`${base}/${lang}/`, { waitUntil: 'networkidle' });
  // full-page capture: render off-screen sections and finish reveal transitions
  await p.addStyleTag({ content: '.cv,.sem,.proc{content-visibility:visible!important} [data-reveal]{transition:none!important}' });
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 700) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(60); }
  await p.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-in')); });
  await p.waitForTimeout(1500);
  const file = path.join(OUT, `${lang}-${w}-full.jpg`);
  await p.screenshot({ path: file, fullPage: true, type: 'jpeg', quality: 82 });
  // above-the-fold at 2x
  const ctx2 = await b.newContext(w === 390 ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const p2 = await ctx2.newPage();
  await p2.goto(`${base}/${lang}/`, { waitUntil: 'networkidle' });
  await p2.waitForTimeout(2600);
  await p2.screenshot({ path: path.join(OUT, `${lang}-${w}-hero.png`) });
  console.log('ok', lang, w);
  await ctx.close();
  await ctx2.close();
}

async function story(b, lang) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(`${base}/${lang}/`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const info = await p.evaluate(() => { const s = document.querySelector('.proc__scroll').getBoundingClientRect(); return { top: s.top + scrollY, h: s.height }; });
  const fr = [0.08, 0.33, 0.55, 0.93];
  for (const [k, f] of fr.entries()) {
    const y = info.top + (info.h - 900) * f;
    await p.evaluate((y) => (window.lenis ? window.lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y)), y);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: path.join(OUT, `${lang}-1440-story-${k + 1}.jpg`), type: 'jpeg', quality: 85 });
  }
  await ctx.close();
}

(async () => {
  const b = await chromium.launch();
  for (const lang of langs) {
    await full(b, lang, 390);
    await full(b, lang, 1440);
    await story(b, lang);
  }
  await b.close();
})();
