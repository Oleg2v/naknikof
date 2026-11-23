import { calcNitrite, SALTS, MEAT } from '../lib/nitrite';

export function initCalc() {
  const form = document.querySelector('[data-calc]');
  if (!form) return;
  const lang = form.dataset.lang === 'he' ? 'he-IL' : 'ru-RU';
  const i18n = JSON.parse(document.getElementById('calc-i18n')?.textContent || '{}');
  const nf = (d) => new Intl.NumberFormat(lang, { maximumFractionDigits: d, minimumFractionDigits: d });
  const $ = (s) => form.querySelector(s);
  const meat = $('#calc-meat');
  const meatRange = $('[name="meatRange"]');
  const rate = $('#calc-rate');
  const chips = form.querySelectorAll('[data-kg]');
  let kind = 'n06';

  const clampKg = (v) => Math.min(MEAT.max, Math.max(MEAT.min, Math.round(v * 10) / 10));

  function setKind(k) {
    kind = k;
    const s = SALTS[k];
    rate.min = String(s.min);
    rate.max = String(s.max);
    rate.step = String(s.step);
    rate.value = String(s.def);
    $('[data-rate-min]').textContent = `${nf(0).format(s.min)} ${i18n.g}`;
    $('[data-rate-max]').textContent = `${nf(0).format(s.max)} ${i18n.g}`;
    $('[data-kind-note]').textContent = i18n[k];
    $('[data-nitrate-row]').hidden = k !== 'n2';
    update();
  }

  function update(source) {
    let kg = parseFloat(String(meat.value).replace(',', '.'));
    if (!Number.isFinite(kg)) kg = 0;
    if (source !== 'typing') {
      kg = clampKg(kg);
      meat.value = String(kg);
    }
    meatRange.value = String(clampKg(kg || MEAT.min));
    chips.forEach((c) => c.classList.toggle('is-on', Number(c.dataset.kg) === kg));
    const r = calcNitrite(kg, Number(rate.value), kind);
    $('[data-rate-out]').textContent = nf(1).format(r.gPerKg);
    $('[data-out-salt]').textContent = nf(r.saltG < 100 ? 1 : 0).format(r.saltG);
    $('[data-out-nitrite]').textContent = nf(0).format(r.nitriteMg);
    $('[data-out-perkg]').textContent = nf(0).format(r.nitriteMgPerKg);
    $('[data-out-nitrate]').textContent = nf(0).format(r.nitrateMg);
    const wa = $('[data-calc-wa]');
    if (wa && i18n.wa) {
      const text = i18n.wa
        .replace('{kg}', nf(1).format(r.meatKg))
        .replace('{salt}', kind === 'n2' ? i18n.n2Name : i18n.n06Name)
        .replace('{g}', nf(1).format(r.saltG))
        .replace('{rate}', nf(1).format(r.gPerKg));
      wa.href = `${i18n.phone}?text=${encodeURIComponent(text)}`;
    }
  }

  form.querySelectorAll('[name="kind"]').forEach((el) => el.addEventListener('change', () => setKind(el.value)));
  meat.addEventListener('input', () => update('typing'));
  meat.addEventListener('change', () => update());
  meatRange.addEventListener('input', () => {
    meat.value = meatRange.value;
    update();
  });
  rate.addEventListener('input', () => update());
  form.querySelectorAll('[data-step]').forEach((b) =>
    b.addEventListener('click', () => {
      meat.value = String(clampKg((parseFloat(meat.value) || 0) + Number(b.dataset.step)));
      update();
    }),
  );
  chips.forEach((c) =>
    c.addEventListener('click', () => {
      meat.value = c.dataset.kg;
      update();
    }),
  );
  update();
}
