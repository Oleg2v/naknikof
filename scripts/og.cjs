/**
 * Open Graph images 1200×630 for /ru and /he, rendered from the live build with Playwright.
 * usage: npm run build && npx wrangler dev (or any static server on :8787) && node scripts/og.cjs [baseUrl]
 */
const { chromium } = require('playwright');
const path = require('path');
const base = process.argv[2] || 'http://127.0.0.1:8787';
const COPY = {
  ru: { lines: ['Всё для', 'домашней', 'колбасы'], tail: 'в Израиле', foot: 'Оболочки · нитритная соль · специи · щепа · оборудование', badge: 'kolbassnik.com' },
  he: { lines: ['כל מה', 'שצריך לנקניק', 'ביתי'], tail: 'בישראל', foot: 'מעטפות · מלח ניטריט · תבלינים · שבבי עישון · ציוד', badge: 'kolbassnik.com' },
};
(async () => {
  const b = await chromium.launch();
  for (const lang of ['ru', 'he']) {
    const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await p.goto(`${base}/${lang}/`, { waitUntil: 'networkidle' });
    const c = COPY[lang];
    const he = await p.evaluate(() => document.querySelector('.hero__title')?.innerText);
    await p.evaluate(({ c, lang }) => {
      const slice = document.querySelector('[data-hero-slice] svg').outerHTML;
      const logo = document.querySelector('.hdr__badge img')?.currentSrc || '';
      document.body.innerHTML = `
        <div class="og" dir="${lang === 'he' ? 'rtl' : 'ltr'}">
          <div class="og__slice">${slice}</div>
          <div class="og__brand"><img src="${logo}" alt=""><span>Kolbassnik</span></div>
          <h1>${c.lines.map((l, i) => `<span class="l${i}">${l}</span>`).join('')}<em>${c.tail}</em></h1>
          <p class="og__foot">${c.foot}</p>
          <p class="og__badge">${c.badge}</p>
        </div>`;
      const st = document.createElement('style');
      st.textContent = `
        html,body{margin:0;background:#f3ebdf}
        .og{position:relative;width:1200px;height:630px;overflow:hidden;background:#f3ebdf;font-family:'Bona Nova',Georgia,serif;color:#1c1214}
        .og__slice{position:absolute;width:640px;height:640px;inset-inline-end:-170px;top:-10px;filter:drop-shadow(0 30px 40px rgba(60,10,20,.3))}
        .og__slice svg{width:100%;height:100%}
        .og__brand{position:absolute;top:44px;inset-inline-start:64px;display:flex;align-items:center;gap:14px;font:700 34px/1 'Bona Nova';color:#6e1634}
        .og__brand img{width:62px;height:62px;border-radius:50%}
        h1{position:absolute;top:128px;inset-inline-start:64px;margin:0;font:700 112px/.92 'Bona Nova';letter-spacing:${lang === 'he' ? 0 : '-.025em'}}
        h1 span{display:block}
        h1 .l1{padding-inline-start:${lang === 'he' ? '0' : '.9em'}}
        h1 .l2{color:#6e1634;display:inline}
        h1 em{font:400 italic 44px/1 'Bona Nova';color:#57463f;margin-inline-start:18px}
        .og__foot{position:absolute;bottom:52px;inset-inline-start:64px;margin:0;font:500 24px/1.2 'Rubik',sans-serif;color:#57463f}
        .og__badge{position:absolute;bottom:44px;inset-inline-end:56px;margin:0;padding:10px 18px;border-radius:999px;background:#1c1214;color:#f3ebdf;font:600 22px/1 'Rubik',sans-serif}`;
      document.head.append(st);
    }, { c, lang });
    await p.waitForTimeout(600);
    const out = path.join(__dirname, '..', 'public', 'og', `og-${lang}.jpg`);
    await p.screenshot({ path: out, type: 'jpeg', quality: 86 });
    console.log('written', out);
    await p.close();
  }
  await b.close();
})();
