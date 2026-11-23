/**
 * Motion core: Lenis smooth scroll + GSAP ScrollTrigger, loaded after first paint.
 * - prefers-reduced-motion → no Lenis, no scroll-driven motion; content is fully visible without JS.
 * - touch / small screens → native scroll (no Lenis), lighter timelines (see `ctx.lite`).
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export const EASE = 'expo.out';
export const EASE_IO = 'power3.inOut';

export function createContext() {
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mqFine = matchMedia('(hover: hover) and (pointer: fine)');
  const mqSmall = matchMedia('(max-width: 820px)');
  const ctx = {
    gsap,
    ScrollTrigger,
    reduce: mqReduce.matches,
    fine: mqFine.matches,
    lite: mqSmall.matches || !mqFine.matches,
    rtl: document.documentElement.dir === 'rtl',
    lenis: null,
  };

  if (!ctx.reduce && ctx.fine && !ctx.lite) {
    const lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1, smoothWheel: true, anchors: { offset: -80 } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    ctx.lenis = lenis;
    window.lenis = lenis;
  }

  // Reduced-motion can change at runtime: simplest robust behaviour is a reload.
  mqReduce.addEventListener?.('change', () => location.reload());

  return ctx;
}
