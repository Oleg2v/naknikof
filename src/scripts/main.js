/**
 * Page bootstrap.
 * 1) Reveal-on-scroll with IntersectionObserver (tiny, no dependencies) — content is visible without JS.
 * 2) Heavier motion (GSAP + ScrollTrigger + Lenis) is imported after the page is idle, so it never
 *    competes with LCP; skipped entirely for prefers-reduced-motion.
 */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function reveals() {
  const els = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
  );
  els.forEach((el) => io.observe(el));
}

function idle(fn, timeout = 1500) {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout });
  else setTimeout(fn, 300);
}

reveals();

// GSAP/Lenis are desktop-only enhancements: phones get native scroll + CSS reveals (no extra JS).
const desktop = document.documentElement.classList.contains('motion-ok');
if (!reduce && desktop) {
  const start = () =>
    idle(async () => {
      const { boot } = await import('./motion/index.js');
      boot();
    });
  if (document.readyState === 'complete') start();
  else addEventListener('load', start, { once: true });
}

// Calculator works with or without motion.
if (document.querySelector('[data-calc]')) import('./calc.js').then((m) => m.initCalc());
