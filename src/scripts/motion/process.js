/**
 * "From meat to sausage" scroll story. Desktop (≥ 901px), fine pointer, motion allowed.
 * One scrubbed master timeline over a sticky stage; chapters are labels ch0…ch3.
 */
export function initProcess({ gsap, ScrollTrigger, lenis }) {
  const section = document.querySelector('#process');
  if (!section) return;
  const mq = matchMedia('(min-width: 901px)');
  if (!mq.matches || !document.documentElement.classList.contains('motion-ok')) return;
  const scroll = section.querySelector('.proc__scroll');
  const svg = section.querySelector('.proc__stage svg');
  const q = (s) => svg.querySelectorAll(s);
  const one = (s) => svg.querySelector(s);
  const chapters = [...section.querySelectorAll('.proc__ch')];
  const ticks = [...section.querySelectorAll('.proc__rail a')];
  const bar = section.querySelector('.proc__bar');
  const rtl = document.documentElement.dir === 'rtl';
  const css = getComputedStyle(document.documentElement);
  const c = (v) => css.getPropertyValue(v).trim();

  // ---------- initial state ----------
  gsap.set(one('.l-outline'), { attr: { 'stroke-dasharray': 1, 'stroke-dashoffset': 1 } });
  gsap.set(one('.l-casingFill'), { opacity: 0 });
  gsap.set(one('.l-fill'), { scaleX: 0, transformOrigin: '0% 50%' });
  gsap.set(q('.l-ties > g'), { scaleY: 0, opacity: 0, transformOrigin: '50% 50%' });
  gsap.set(one('.l-ties'), { opacity: 1 });
  gsap.set(one('.l-smoked'), { opacity: 0 });
  gsap.set(one('.l-embers'), { opacity: 0 });
  gsap.set(one('.l-smoke'), { opacity: 0 });
  gsap.set(q('.l-smoke path'), { attr: { 'stroke-dasharray': 1, 'stroke-dashoffset': 1 } });
  gsap.set(one('.l-hook'), { opacity: 0, y: -260 });
  gsap.set(one('.l-knife'), { opacity: 0, y: -260 });
  gsap.set(one('.l-cut'), { opacity: 1 });
  gsap.set(q('.l-cut > g:first-child'), { opacity: 0 });
  gsap.set(q('.l-slice'), { opacity: 0, x: -90, rotate: -12, transformOrigin: '50% 50%' });
  gsap.set(chapters.slice(1), { autoAlpha: 0, y: 30 });
  gsap.set(chapters[0], { autoAlpha: 1, y: 0 });

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  const text = (i, at) => {
    if (i > 0) tl.to(chapters[i - 1], { autoAlpha: 0, y: -24, duration: 0.18, ease: 'power2.in' }, at - 0.18);
    tl.fromTo(chapters[i], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power2.out' }, at + 0.02);
  };

  // ---- ch0: casing unshirrs and draws ----
  tl.addLabel('ch0', 0)
    .to(q('.l-shirr ellipse'), { x: (i) => (14 - i) * 8 + 60, opacity: 0, duration: 0.4, stagger: 0.02, ease: 'power2.in' }, 0.08)
    .to(one('.l-outline'), { attr: { 'stroke-dashoffset': 0 }, duration: 0.6, ease: 'power1.inOut' }, 0.12)
    .to(one('.l-casingFill'), { opacity: 1, duration: 0.3 }, 0.5);

  // ---- ch1: stuffing ----
  tl.addLabel('ch1', 1);
  text(1, 1);
  tl.to(one('.l-fill'), { scaleX: 1, duration: 0.6, ease: 'power1.inOut' }, 1.05)
    .to(q('.l-ties > g'), { scaleY: 1, opacity: 1, duration: 0.22, stagger: 0.08, ease: 'back.out(2)' }, 1.6)
    .to(one('.l-horn'), { x: -260, opacity: 0, duration: 0.3, ease: 'power2.in' }, 1.62);

  // ---- ch2: smoking ----
  tl.addLabel('ch2', 2);
  text(2, 2);
  tl.to(section, { '--stage-bg': c('--smoke'), '--stage-fg': c('--cream-on-dark'), '--stage-muted': c('--muted-on-dark'), '--stage-accent': '#f0b49b', duration: 0.3 }, 1.92)
    .to(one('.l-board'), { opacity: 0, y: 40, duration: 0.25 }, 1.95)
    .to(one('.l-sausage'), { y: -80, duration: 0.3, ease: 'power2.inOut' }, 2.0)
    .to(one('.l-hook'), { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 2.0)
    .to(one('.l-embers'), { opacity: 1, duration: 0.3 }, 2.05)
    .to(one('.l-smoke'), { opacity: 0.38, duration: 0.2 }, 2.1)
    .to(q('.l-smoke path'), { attr: { 'stroke-dashoffset': 0 }, duration: 0.55, stagger: 0.06 }, 2.1)
    .to(one('.l-smoked'), { opacity: 1, duration: 0.6 }, 2.2)
    .to(q('.l-smoke path'), { attr: { 'stroke-dashoffset': -1 }, duration: 0.3, stagger: 0.04 }, 2.68);

  // ---- ch3: slicing ----
  tl.addLabel('ch3', 3);
  text(3, 3);
  tl.to(section, { '--stage-bg': c('--paper'), '--stage-fg': c('--ink'), '--stage-muted': c('--ink-2'), '--stage-accent': c('--accent'), duration: 0.3 }, 2.92)
    .to(one('.l-smoke'), { opacity: 0, duration: 0.15 }, 2.9)
    .to(one('.l-embers'), { opacity: 0, duration: 0.25 }, 2.95)
    .to(one('.l-hook'), { opacity: 0, y: -260, duration: 0.25, ease: 'power2.in' }, 2.95)
    .to(one('.l-board'), { opacity: 1, y: 0, duration: 0.25 }, 3.0)
    .to(one('.l-sausage'), { y: 0, duration: 0.3, ease: 'power2.inOut' }, 3.0)
    .to(one('.l-knife'), { opacity: 1, y: 0, duration: 0.25, ease: 'power3.in' }, 3.3)
    .set(one('.l-left'), { clipPath: 'inset(0% 0% 0% 0%)' }, 3.3)
    .to(one('.l-left'), { clipPath: 'inset(0% 26% 0% 0%)', duration: 0.05 }, 3.55)
    .to(q('.l-cut > g:first-child'), { opacity: 1, duration: 0.05 }, 3.55)
    .to(one('.l-knife'), { y: -60, x: 20, duration: 0.2, ease: 'power2.out' }, 3.6)
    .to(q('.l-slice'), { opacity: 1, x: 0, rotate: 0, duration: 0.3, stagger: 0.06, ease: 'power3.out' }, 3.6)
    .to({}, { duration: 0.25 }); // dwell on the final plate

  const total = tl.duration();
  let active = 0;
  const setActive = (i) => {
    if (i === active) return;
    active = i;
    ticks.forEach((t, k) => {
      t.classList.toggle('is-on', k === i);
      if (k === i) t.setAttribute('aria-current', 'step');
      else t.removeAttribute('aria-current');
    });
  };
  ticks[0]?.classList.add('is-on');
  ticks[0]?.setAttribute('aria-current', 'step');

  const st = ScrollTrigger.create({
    trigger: scroll,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.7,
    animation: tl,
    onUpdate: (self) => {
      const t = self.progress * total;
      setActive(Math.min(3, Math.floor(t)));
      bar?.style.setProperty('--p', self.progress.toFixed(3));
    },
    onToggle: (self) => svg.style.setProperty('will-change', self.isActive ? 'transform' : 'auto'),
  });

  // Rail navigation → scroll to chapter label
  ticks.forEach((a, i) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const y = st.start + ((st.end - st.start) * (i + 0.12)) / total;
      if (lenis) lenis.scrollTo(y, { duration: 1.2 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    }),
  );

  mq.addEventListener('change', () => location.reload(), { once: true });
  ScrollTrigger.refresh();
}
