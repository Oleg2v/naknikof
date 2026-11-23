/**
 * Desktop-only cursor companion: a ring that trails the pointer and a label pill for [data-cursor] targets.
 * The native cursor stays visible (usability); nothing is created on touch / coarse pointers.
 */
export function initCursor({ gsap }) {
  const ring = document.createElement('div');
  ring.className = 'cur';
  ring.setAttribute('aria-hidden', 'true');
  ring.innerHTML = '<span class="cur__ring"></span><span class="cur__label"></span>';
  document.body.append(ring);
  const label = ring.querySelector('.cur__label');
  const xTo = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3.out' });
  const yTo = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3.out' });
  let shown = false;

  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!shown) {
        shown = true;
        gsap.set(ring, { x: e.clientX, y: e.clientY });
        ring.classList.add('is-on');
      }
      xTo(e.clientX);
      yTo(e.clientY);
      const t = e.target.closest?.('[data-cursor], a, button, input, label, [role="slider"]');
      const text = t?.getAttribute?.('data-cursor');
      ring.classList.toggle('is-hover', !!t);
      ring.classList.toggle('is-label', !!text);
      if (text && label.textContent !== text) label.textContent = text;
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => ring.classList.remove('is-on'));
  document.addEventListener('pointerenter', () => shown && ring.classList.add('is-on'));
  addEventListener('review:mode', (e) => ring.classList.toggle('is-off', e.detail.on));
}
