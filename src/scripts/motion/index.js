/**
 * Motion layer entry (loaded on idle, never under prefers-reduced-motion).
 */
import { createContext } from './core.js';
import { initProcess } from './process.js';
import { initHero } from './hero.js';

export function boot() {
  const ctx = createContext();
  initHero(ctx);
  initProcess(ctx);
  if (ctx.fine && !ctx.lite) import('./cursor.js').then((m) => m.initCursor(ctx));
  // Fonts or late images can change layout: refresh triggers once everything settled.
  document.fonts?.ready.then(() => ctx.ScrollTrigger.refresh());
}
