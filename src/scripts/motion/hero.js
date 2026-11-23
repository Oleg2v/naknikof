/** Hero: scroll-linked parallax + slice rotation (desktop only). */
export function initHero({ gsap, lite }) {
  const hero = document.querySelector('.hero');
  if (!hero || lite) return;
  const slice = hero.querySelector('[data-hero-slice]');
  const orbit = hero.querySelector('[data-hero-orbit]');
  const lines = hero.querySelectorAll('.hero__line');
  const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 };
  if (slice) gsap.to(slice, { rotate: 70, yPercent: 14, ease: 'none', scrollTrigger: st });
  if (orbit) gsap.to(orbit, { rotate: -50, ease: 'none', scrollTrigger: st });
  lines.forEach((l, i) => gsap.to(l, { xPercent: (i % 2 ? 1 : -1) * (4 + i * 2), ease: 'none', scrollTrigger: st }));

  // Pointer tilt on the slice (subtle, desktop).
  if (slice) {
    const rx = gsap.quickTo(slice, 'x', { duration: 0.9, ease: 'power3.out' });
    const ry = gsap.quickTo(slice, 'y', { duration: 0.9, ease: 'power3.out' });
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      rx(((e.clientX - r.left) / r.width - 0.5) * 30);
      ry(((e.clientY - r.top) / r.height - 0.5) * 20);
    });
  }
}
