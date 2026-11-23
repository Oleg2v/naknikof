/**
 * Review comments overlay ("comments like in Figma").
 *
 * Loaded ONLY on demand (click on the launcher or ?comments=1), never during normal page load.
 * Pins are anchored to an element (CSS selector) + relative coordinates inside its box, so they
 * stay on the right spot across screen sizes. Each comment remembers the page language (ru/he)
 * and direction; pins from the other language version can be shown mirrored.
 *
 * Storage: /api/comments (Cloudflare Worker + SQLite Durable Object). No accounts: name only.
 */

const API = '/api/comments';
const LS_NAME = 'kr-name';
const LS_CLIENT = 'kr-client';
const LS_PREFS = 'kr-prefs';

const T = {
  ru: {
    launcher: 'Комментировать',
    toolbar: 'Режим комментариев',
    hint: 'Нажмите на любое место страницы, чтобы оставить комментарий',
    hintTouch: 'Коснитесь любого места страницы, чтобы оставить комментарий',
    done: 'Готово',
    list: 'Все комментарии',
    showResolved: 'Показывать решённые',
    showOther: 'С версии на иврите',
    nameTitle: 'Как вас зовут?',
    nameHint: 'Имя увидят все участники обсуждения. Регистрация не нужна.',
    namePh: 'Например, Артём',
    continue: 'Продолжить',
    cancel: 'Отмена',
    placeholder: 'Ваш комментарий…',
    replyPh: 'Ответить…',
    send: 'Отправить',
    reply: 'Ответить',
    resolve: 'Решено',
    reopen: 'Открыть снова',
    resolvedBy: 'решено',
    del: 'Удалить',
    delConfirm: 'Удалить этот комментарий вместе с ответами?',
    close: 'Закрыть',
    empty: 'Пока нет комментариев. Нажмите на страницу, чтобы оставить первый.',
    open: 'открытые',
    resolved: 'решённые',
    error: 'Не удалось сохранить. Проверьте соединение и попробуйте ещё раз.',
    loadError: 'Не удалось загрузить комментарии.',
    offPage: 'Элемент не найден — показан по сохранённым координатам',
    otherLang: 'Оставлен на версии',
    you: 'вы',
    shortcut: 'Ctrl/⌘ + Enter — отправить',
    changeName: 'Сменить имя',
    goto: 'Открыть на странице',
  },
  he: {
    launcher: 'הוספת הערה',
    toolbar: 'מצב הערות',
    hint: 'לחצו במקום כלשהו בעמוד כדי להוסיף הערה',
    hintTouch: 'הקישו במקום כלשהו בעמוד כדי להוסיף הערה',
    done: 'סיום',
    list: 'כל ההערות',
    showResolved: 'הצגת הערות שטופלו',
    showOther: 'מהגרסה הרוסית',
    nameTitle: 'איך קוראים לך?',
    nameHint: 'השם יוצג לכל המשתתפים בדיון. אין צורך בהרשמה.',
    namePh: 'לדוגמה: ארטיום',
    continue: 'המשך',
    cancel: 'ביטול',
    placeholder: 'כתבו הערה…',
    replyPh: 'כתבו תגובה…',
    send: 'שליחה',
    reply: 'תגובה',
    resolve: 'סימון כטופל',
    reopen: 'פתיחה מחדש',
    resolvedBy: 'טופל',
    del: 'מחיקה',
    delConfirm: 'למחוק את ההערה הזאת יחד עם התגובות?',
    close: 'סגירה',
    empty: 'עדיין אין הערות. לחצו על העמוד כדי להוסיף את הראשונה.',
    open: 'פתוחות',
    resolved: 'טופלו',
    error: 'השמירה נכשלה. בדקו את החיבור ונסו שוב.',
    loadError: 'לא הצלחנו לטעון את ההערות.',
    offPage: 'הרכיב לא נמצא — ההערה מוצגת לפי המיקום השמור',
    otherLang: 'נכתבה בגרסה',
    you: 'אני',
    shortcut: 'Ctrl/⌘ + Enter — שליחה',
    changeName: 'שינוי שם',
    goto: 'הצגה בעמוד',
  },
};

const STYLES = `
.kr-ui, .kr-ui * { box-sizing: border-box; }
.kr-ui { font: 500 14px/1.4 var(--font-ui, system-ui, sans-serif); color: #1b1414; letter-spacing: 0; text-transform: none; }
.kr-ui button { font: inherit; cursor: pointer; }
.kr-ui :focus-visible { outline: 2px solid #8c1c2c; outline-offset: 2px; }
html.kr-on, html.kr-on * { cursor: crosshair !important; }
html.kr-on .review-launcher { display: none !important; }
html.kr-on .kr-ui, html.kr-on .kr-ui * { cursor: auto !important; }
html.kr-on .kr-ui button, html.kr-on .kr-ui .kr-pin { cursor: pointer !important; }
html.kr-on .kr-ui textarea, html.kr-on .kr-ui input { cursor: text !important; }
.kr-layer { position: absolute; top: 0; left: 0; width: 100%; height: 0; overflow: hidden; pointer-events: none; z-index: 2147483000; }
.kr-layer .kr-pin { pointer-events: auto; }
.kr-pin { position: absolute; width: 30px; height: 30px; display: grid; place-items: center; border: 2px solid #fff;
  background: #8c1c2c; color: #fff; font-weight: 700; font-size: 13px; line-height: 1; border-radius: 50% 50% 50% 0;
  transform: translate(0, -100%); box-shadow: 0 6px 18px rgba(30,10,10,.35); transition: transform .15s ease, background .15s; padding: 0; }
.kr-pin.rtl { border-radius: 50% 50% 0 50%; transform: translate(-100%, -100%); }
.kr-pin:hover, .kr-pin.is-active { transform: translate(0, -100%) scale(1.12); }
.kr-pin.rtl:hover, .kr-pin.rtl.is-active { transform: translate(-100%, -100%) scale(1.12); }
.kr-pin.is-resolved { background: #7c7570; }
.kr-pin.is-other { background: #2f5d62; }
.kr-pin.is-lost { outline: 2px dashed #8c1c2c; outline-offset: 2px; }
.kr-pin.is-draft { background: #1b1414; }
.kr-hover { position: fixed; pointer-events: none; z-index: 2147482999; border: 1.5px solid #8c1c2c; border-radius: 4px;
  background: rgba(140,28,44,.06); transition: all .08s linear; display: none; }
.kr-bar { position: fixed; z-index: 2147483001; inset-block-end: max(14px, env(safe-area-inset-bottom)); inset-inline: 12px; margin-inline: auto; max-width: 940px;
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 8px 8px 8px 14px; border-radius: 14px;
  background: #1b1414; color: #f6efe6; box-shadow: 0 12px 40px rgba(0,0,0,.35); }
.kr-bar .kr-title { font-weight: 700; display: flex; align-items: center; gap: 8px; }
.kr-bar .kr-dot { width: 8px; height: 8px; border-radius: 50%; background: #e2574c; box-shadow: 0 0 0 4px rgba(226,87,76,.25); }
.kr-bar .kr-hint { opacity: .75; font-weight: 400; flex: 1 1 240px; }
.kr-bar label { display: inline-flex; align-items: center; gap: 6px; font-weight: 400; opacity: .9; white-space: nowrap; }
.kr-bar input[type=checkbox] { accent-color: #e2574c; width: 16px; height: 16px; }
.kr-btn { border: 0; border-radius: 10px; padding: 8px 14px; background: #f6efe6; color: #1b1414; font-weight: 700; }
.kr-btn.ghost { background: transparent; color: inherit; border: 1px solid currentColor; }
.kr-btn.primary { background: #8c1c2c; color: #fff; }
.kr-btn[disabled] { opacity: .5; cursor: not-allowed; }
.kr-pop { position: fixed; z-index: 2147483002; width: min(340px, calc(100vw - 24px)); max-height: min(70vh, 560px); overflow: auto;
  background: #fffaf3; border-radius: 14px; box-shadow: 0 18px 60px rgba(30,10,10,.35); border: 1px solid #eadfd2; overscroll-behavior: contain; }
.kr-pop header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-block-end: 1px solid #eadfd2; position: sticky; top: 0; background: inherit; }
.kr-pop header .kr-num { font-weight: 800; color: #8c1c2c; }
.kr-pop header .kr-sp { flex: 1; }
.kr-icon { border: 0; background: transparent; width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; color: #1b1414; }
.kr-icon:hover { background: #f1e6d8; }
.kr-msg { padding: 10px 12px; border-block-end: 1px solid #f1e6d8; }
.kr-msg .kr-meta { display: flex; gap: 6px; align-items: baseline; flex-wrap: wrap; font-size: 12px; color: #6b5f57; margin-block-end: 2px; }
.kr-msg .kr-meta b { color: #1b1414; font-size: 13px; }
.kr-msg p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.kr-tag { font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 6px; background: #efe3d4; color: #5a4636; }
.kr-tag.res { background: #e3efe6; color: #24563a; }
.kr-form { padding: 10px 12px 12px; display: grid; gap: 8px; }
.kr-form textarea, .kr-form input { width: 100%; min-height: 44px; resize: vertical; border-radius: 10px; border: 1px solid #d9cbbb;
  padding: 10px 12px; font: 400 15px/1.4 var(--font-ui, system-ui, sans-serif); background: #fff; color: #1b1414; }
.kr-form textarea { min-height: 76px; }
.kr-form .kr-row { display: flex; gap: 8px; justify-content: flex-end; align-items: center; }
.kr-form .kr-kbd { margin-inline-end: auto; font-size: 11px; color: #8a7d73; }
.kr-err { color: #a3192b; font-size: 13px; }
.kr-note { font-size: 12px; color: #6b5f57; padding: 8px 12px 0; }
.kr-modal-back { position: fixed; inset: 0; z-index: 2147483003; background: rgba(20,10,10,.45); display: grid; place-items: center; padding: 16px; }
.kr-modal { width: min(400px, 100%); background: #fffaf3; border-radius: 16px; padding: 20px; box-shadow: 0 24px 70px rgba(0,0,0,.4); }
.kr-modal h2 { margin: 0 0 4px; font-size: 20px; line-height: 1.2; }
.kr-modal p { margin: 0 0 12px; color: #6b5f57; }
.kr-side { position: fixed; z-index: 2147483002; inset-block: 0; inset-inline-end: 0; width: min(380px, 100vw); background: #fffaf3;
  box-shadow: -20px 0 60px rgba(0,0,0,.25); display: flex; flex-direction: column; }
.kr-side[dir=rtl] { box-shadow: 20px 0 60px rgba(0,0,0,.25); }
.kr-side header { display: flex; align-items: center; gap: 8px; padding: 14px 14px 10px; border-block-end: 1px solid #eadfd2; }
.kr-side header h2 { margin: 0; font-size: 17px; flex: 1; }
.kr-side .kr-filters { display: flex; gap: 6px; padding: 10px 14px; flex-wrap: wrap; }
.kr-chip { border: 1px solid #d9cbbb; background: #fff; border-radius: 999px; padding: 4px 10px; font-size: 13px; }
.kr-chip[aria-pressed=true] { background: #1b1414; color: #fff; border-color: #1b1414; }
.kr-side ol { list-style: none; margin: 0; padding: 0 0 20px; overflow: auto; flex: 1; overscroll-behavior: contain; }
.kr-side li button { all: unset; box-sizing: border-box; display: grid; grid-template-columns: 34px 1fr; gap: 10px; width: 100%; padding: 12px 14px;
  border-block-end: 1px solid #f1e6d8; cursor: pointer; text-align: start; }
.kr-side li button:hover, .kr-side li button:focus-visible { background: #f6ecdf; }
.kr-side .kr-n { width: 28px; height: 28px; border-radius: 50%; background: #8c1c2c; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 12px; }
.kr-side .is-resolved .kr-n { background: #7c7570; }
.kr-side .kr-li-body { min-width: 0; }
.kr-side .kr-li-body p { margin: 2px 0 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
.kr-side .kr-empty { padding: 20px 14px; color: #6b5f57; }
.kr-toast { position: fixed; z-index: 2147483004; inset-block-end: 20px; inset-inline-start: 50%; transform: translateX(-50%);
  background: #1b1414; color: #fff; padding: 10px 16px; border-radius: 10px; }
[dir=rtl] .kr-toast { transform: translateX(50%); }
@media (max-width: 640px) {
  .kr-bar { inset-block-end: max(8px, env(safe-area-inset-bottom)); inset-inline: 8px; padding: 8px; gap: 6px 8px; }
  .kr-bar .kr-hint { flex-basis: 100%; order: 5; font-size: 13px; }
  .kr-pop { inset-inline: 0 !important; inset-block-end: 0 !important; top: auto !important; left: 0 !important; width: 100%;
    max-height: 72vh; border-radius: 16px 16px 0 0; }
}
@media (prefers-reduced-motion: reduce) { .kr-pin, .kr-hover { transition: none; } }
`;

const icon = {
  close: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  check: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 9.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  undo: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M6 4L2.5 7.5 6 11M3 7.5h7.5a4.5 4.5 0 010 9H8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  trash: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 9h5.6l.7-9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/* ------------------------------------------------------------------ */

const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v; // only for our own static SVG icons
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
};

const lsGet = (k, d = null) => {
  try {
    const v = localStorage.getItem(k);
    return v == null ? d : v;
  } catch {
    return d;
  }
};
const lsSet = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode */
  }
};

const uid = () =>
  (crypto.randomUUID && crypto.randomUUID()) || `c${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

/** Build a stable selector for an element: data-cid / id first, then a short nth-of-type path. */
function selectorFor(el) {
  const stop = (n) => n === document.body || n === document.documentElement;
  // Skip generated text-split spans: anchor to their block ancestor.
  while (el && !stop(el) && el.closest && el.matches('[data-split], [data-split] *, .char, .word, .line')) {
    const s = el.closest('[data-split]');
    el = s && s !== el ? s : el.parentElement;
  }
  const parts = [];
  let n = el;
  while (n && !stop(n)) {
    if (n.dataset && n.dataset.cid) {
      parts.unshift(`[data-cid="${CSS.escape(n.dataset.cid)}"]`);
      break;
    }
    if (n.id && !/^\d/.test(n.id)) {
      parts.unshift(`#${CSS.escape(n.id)}`);
      break;
    }
    const tag = n.localName;
    let i = 1;
    let s = n;
    while ((s = s.previousElementSibling)) if (s.localName === tag) i++;
    parts.unshift(`${tag}:nth-of-type(${i})`);
    n = n.parentElement;
    if (parts.length > 7) break;
  }
  return { selector: parts.join(' > ') || 'body', el };
}

const fmtTime = (ts, lang) => {
  const diff = (ts - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), 'day');
  return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(ts);
};

/* ------------------------------------------------------------------ */

class Review {
  constructor() {
    this.lang = document.documentElement.lang === 'he' ? 'he' : 'ru';
    this.dir = this.lang === 'he' ? 'rtl' : 'ltr';
    this.t = T[this.lang];
    this.threads = [];
    this.on = false;
    this.pop = null;
    this.activeId = null;
    this.touch = matchMedia('(hover: none)').matches;
    let prefs = {};
    try {
      prefs = JSON.parse(lsGet(LS_PREFS, '{}')) || {};
    } catch {
      prefs = {};
    }
    this.prefs = { showResolved: false, showOther: false, ...prefs };
    this.client = lsGet(LS_CLIENT) || (lsSet(LS_CLIENT, uid()), lsGet(LS_CLIENT)) || uid();
    this.name = lsGet(LS_NAME, '');

    const style = h('style', { id: 'kr-style' });
    style.textContent = STYLES;
    document.head.append(style);

    this.layer = h('div', { class: 'kr-ui kr-layer', 'data-kr-ui': '', 'aria-live': 'polite' });
    this.hover = h('div', { class: 'kr-hover', 'aria-hidden': 'true' });
    document.body.append(this.layer, this.hover);

    this.onCapture = this.onCapture.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onKey = this.onKey.bind(this);
    this.schedule = this.schedule.bind(this);
    this.raf = 0;
  }

  /* ---------- data ---------- */
  async load() {
    try {
      const r = await fetch(API, { headers: { accept: 'application/json' }, cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      this.threads = d.threads || [];
    } catch (e) {
      this.toast(this.t.loadError);
    }
    this.render();
  }

  async send(method, path, body) {
    const r = await fetch(API + path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, author: this.name, client: this.client }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  /* ---------- mode ---------- */
  async start() {
    if (!this.name) {
      const ok = await this.askName();
      if (!ok) return false;
    }
    this.on = true;
    document.documentElement.classList.add('kr-on');
    this.mountBar();
    document.addEventListener('click', this.onCapture, true);
    document.addEventListener('submit', this.onCapture, true);
    document.addEventListener('pointermove', this.onMove, { passive: true });
    document.addEventListener('keydown', this.onKey, true);
    addEventListener('scroll', this.schedule, { passive: true });
    addEventListener('resize', this.schedule, { passive: true });
    this.ro = new ResizeObserver(this.schedule);
    this.ro.observe(document.body);
    this.tick = setInterval(this.schedule, 600); // follow scroll-driven animations
    this.poll = setInterval(() => !this.pop && this.load(), 20000);
    window.dispatchEvent(new CustomEvent('review:mode', { detail: { on: true } }));
    await this.load();
    const m = location.hash.match(/^#comment-(\d+)$/);
    if (m) this.openByNumber(+m[1]);
    return true;
  }

  stop() {
    this.on = false;
    this.closePop();
    document.documentElement.classList.remove('kr-on');
    document.removeEventListener('click', this.onCapture, true);
    document.removeEventListener('submit', this.onCapture, true);
    document.removeEventListener('pointermove', this.onMove);
    document.removeEventListener('keydown', this.onKey, true);
    removeEventListener('scroll', this.schedule);
    removeEventListener('resize', this.schedule);
    this.ro && this.ro.disconnect();
    clearInterval(this.tick);
    clearInterval(this.poll);
    this.bar && this.bar.remove();
    this.side && this.side.remove();
    this.side = null;
    this.layer.replaceChildren();
    this.hover.style.display = 'none';
    const u = new URL(location.href);
    if (u.searchParams.has('comments')) {
      u.searchParams.delete('comments');
      u.hash = '';
      history.replaceState(null, '', u);
    }
    window.dispatchEvent(new CustomEvent('review:mode', { detail: { on: false } }));
  }

  mountBar() {
    const t = this.t;
    const other = h('input', { type: 'checkbox', checked: this.prefs.showOther || null });
    other.addEventListener('change', () => this.setPref('showOther', other.checked));
    const resolved = h('input', { type: 'checkbox', checked: this.prefs.showResolved || null });
    resolved.addEventListener('change', () => this.setPref('showResolved', resolved.checked));
    this.bar = h(
      'div',
      { class: 'kr-ui kr-bar', 'data-kr-ui': '', 'data-lenis-prevent': '', role: 'toolbar', 'aria-label': t.toolbar, dir: this.dir },
      h('span', { class: 'kr-title' }, h('span', { class: 'kr-dot', 'aria-hidden': 'true' }), t.toolbar),
      h('span', { class: 'kr-hint' }, this.touch ? t.hintTouch : t.hint),
      h('label', {}, resolved, t.showResolved),
      h('label', {}, other, t.showOther),
      h('button', { class: 'kr-btn ghost', type: 'button', onclick: () => this.toggleSide() }, t.list),
      h('button', { class: 'kr-btn', type: 'button', onclick: () => this.stop() }, t.done),
    );
    document.body.append(this.bar);
  }

  setPref(k, v) {
    this.prefs[k] = v;
    lsSet(LS_PREFS, JSON.stringify(this.prefs));
    this.render();
    if (this.side) this.renderSide();
  }

  /* ---------- events ---------- */
  isUI(target) {
    return !!(target && target.closest && target.closest('[data-kr-ui]'));
  }

  onKey(e) {
    if (e.key === 'Escape') {
      if (this.pop) this.closePop();
      else if (this.side) this.toggleSide(false);
      else this.stop();
      e.stopPropagation();
    }
  }

  onMove(e) {
    if (!this.on || this.touch) return;
    if (this.isUI(e.target)) {
      this.hover.style.display = 'none';
      return;
    }
    const { el } = selectorFor(e.target);
    if (!el || el === document.body) return;
    const r = el.getBoundingClientRect();
    Object.assign(this.hover.style, {
      display: 'block',
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    });
  }

  onCapture(e) {
    if (!this.on || this.isUI(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (e.type !== 'click') return;
    if (this.pop) {
      this.closePop();
      return;
    }
    const { selector, el } = selectorFor(e.target);
    const r = el.getBoundingClientRect();
    // Keyboard "click" (detail === 0) → centre of the element.
    const cx = e.detail === 0 || (!e.clientX && !e.clientY) ? r.left + r.width / 2 : e.clientX;
    const cy = e.detail === 0 || (!e.clientX && !e.clientY) ? r.top + r.height / 2 : e.clientY;
    const x = r.width ? (cx - r.left) / r.width : 0.5;
    const y = r.height ? (cy - r.top) / r.height : 0.5;
    const section = el.closest('section[id], header[id], footer[id], [data-section]');
    const draft = {
      selector,
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
      page_x: (cx + scrollX) / document.documentElement.scrollWidth,
      page_y: cy + scrollY,
      doc_h: document.documentElement.scrollHeight,
      vw: innerWidth,
      vh: innerHeight,
      section: section ? section.id || section.dataset.section : null,
      snippet: (el.innerText || el.getAttribute('aria-label') || el.alt || '').replace(/\s+/g, ' ').trim().slice(0, 100),
      lang: this.lang,
    };
    this.openComposer(draft);
  }

  /* ---------- positioning ---------- */
  schedule() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.position();
    });
  }

  clipAncestor(el) {
    // nearest scroll/clip container (e.g. the product rail) — pins outside its visible box are hidden
    for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') return a;
    }
    return null;
  }

  locate(th) {
    let el = null;
    try {
      el = document.querySelector(th.selector);
    } catch {
      el = null;
    }
    const mirror = th.dir !== this.dir;
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width || r.height) {
        const x = mirror ? 1 - th.x : th.x;
        const vx = r.left + x * r.width;
        const vy = r.top + th.y * r.height;
        if (th._clipEl === undefined || th._clipFor !== el) {
          th._clipEl = this.clipAncestor(el);
          th._clipFor = el;
        }
        if (th._clipEl) {
          const c = th._clipEl.getBoundingClientRect();
          if (vx < c.left - 2 || vx > c.right + 2 || vy < c.top - 2 || vy > c.bottom + 2) return { hidden: true };
        }
        return { x: vx + scrollX, y: vy + scrollY, lost: false, el };
      }
    }
    if (th.page_y != null) {
      const docW = document.documentElement.scrollWidth;
      const px = th.page_x != null ? (mirror ? 1 - th.page_x : th.page_x) : 0.5;
      const scale = th.doc_h ? document.documentElement.scrollHeight / th.doc_h : 1;
      return { x: px * docW, y: th.page_y * scale, lost: true, el: null };
    }
    return null;
  }

  visible(th) {
    if (th.lang !== this.lang && !this.prefs.showOther) return false;
    if (th.resolved && !this.prefs.showResolved && th.id !== this.activeId) return false;
    return true;
  }

  render() {
    if (!this.on) return;
    this.layer.replaceChildren();
    for (const th of this.threads) {
      if (!this.visible(th)) continue;
      const pin = h(
        'button',
        {
          type: 'button',
          class: `kr-pin ${this.dir === 'rtl' ? 'rtl' : ''} ${th.resolved ? 'is-resolved' : ''} ${th.lang !== this.lang ? 'is-other' : ''} ${th.id === this.activeId ? 'is-active' : ''}`,
          'data-id': th.id,
          'aria-label': `#${th.number} — ${th.author}: ${th.body.slice(0, 80)}`,
          onclick: (e) => {
            e.stopPropagation();
            this.openThread(th.id);
          },
        },
        String(th.number),
      );
      th._pin = pin;
      this.layer.append(pin);
    }
    if (this.draft) {
      this.draft._pin = h('span', { class: `kr-pin is-draft ${this.dir === 'rtl' ? 'rtl' : ''}`, 'aria-hidden': 'true' }, '+');
      this.layer.append(this.draft._pin);
    }
    this.position();
  }

  position() {
    this.layer.style.height = `${document.documentElement.scrollHeight}px`;
    for (const th of [...this.threads, this.draft].filter(Boolean)) {
      if (!th._pin || !th._pin.isConnected) continue;
      const p = this.locate(th);
      if (!p || p.hidden) {
        th._pin.style.display = 'none';
        continue;
      }
      th._pin.style.display = '';
      th._pin.style.left = `${p.x}px`;
      th._pin.style.top = `${p.y}px`;
      th._pin.classList.toggle('is-lost', p.lost);
      th._pin.title = p.lost ? this.t.offPage : '';
    }
    if (this.pop && this.popAnchor) this.placePop();
  }

  placePop() {
    if (matchMedia('(max-width: 640px)').matches) return; // bottom sheet
    const pin = this.popAnchor;
    if (!pin || !pin.isConnected) return;
    const r = pin.getBoundingClientRect();
    const pw = this.pop.offsetWidth;
    const ph = this.pop.offsetHeight;
    let left = this.dir === 'rtl' ? r.left - pw - 10 : r.right + 10;
    if (left + pw > innerWidth - 12) left = r.left - pw - 10;
    if (left < 12) left = Math.min(innerWidth - pw - 12, r.right + 10);
    let top = r.top - 10;
    top = Math.max(12, Math.min(top, innerHeight - ph - 12));
    this.pop.style.left = `${Math.max(12, left)}px`;
    this.pop.style.top = `${top}px`;
  }

  /* ---------- popovers ---------- */
  closePop() {
    if (this.pop) this.pop.remove();
    this.pop = null;
    this.popAnchor = null;
    this.draft = null;
    const wasActive = this.activeId;
    this.activeId = null;
    if (wasActive && location.hash.startsWith('#comment-')) history.replaceState(null, '', location.pathname + location.search);
    this.render();
  }

  mountPop(node, anchor) {
    if (this.pop) this.pop.remove();
    this.pop = h('div', { class: 'kr-ui kr-pop', 'data-kr-ui': '', 'data-lenis-prevent': '', role: 'dialog', dir: this.dir }, node);
    document.body.append(this.pop);
    this.popAnchor = anchor;
    this.placePop();
  }

  openComposer(draft) {
    this.closePop();
    this.draft = draft;
    this.render();
    const t = this.t;
    const ta = h('textarea', { placeholder: t.placeholder, 'aria-label': t.placeholder, dir: 'auto', maxlength: '2000' });
    const err = h('div', { class: 'kr-err', role: 'alert' });
    const sendBtn = h('button', { class: 'kr-btn primary', type: 'submit' }, t.send);
    const form = h(
      'form',
      {
        class: 'kr-form',
        onsubmit: async (e) => {
          e.preventDefault();
          const body = ta.value.trim();
          if (!body) return ta.focus();
          sendBtn.disabled = true;
          try {
            const payload = Object.fromEntries(Object.entries(draft).filter(([k]) => !k.startsWith('_')));
            const d = await this.send('POST', '', { ...payload, body });
            this.threads.push(d.thread);
            this.draft = null;
            this.openThread(d.thread.id);
          } catch {
            err.textContent = t.error;
            sendBtn.disabled = false;
          }
        },
      },
      ta,
      err,
      h(
        'div',
        { class: 'kr-row' },
        h('span', { class: 'kr-kbd' }, this.touch ? '' : t.shortcut),
        h('button', { class: 'kr-btn ghost', type: 'button', onclick: () => this.closePop() }, t.cancel),
        sendBtn,
      ),
    );
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) form.requestSubmit();
    });
    const head = h(
      'header',
      {},
      h('b', {}, this.name),
      h('span', { class: 'kr-sp' }),
      h('button', { class: 'kr-icon', type: 'button', 'aria-label': t.close, html: icon.close, onclick: () => this.closePop() }),
    );
    this.mountPop(h('div', {}, head, form), draft._pin);
    ta.focus({ preventScroll: true });
  }

  openByNumber(n) {
    const th = this.threads.find((x) => x.number === n);
    if (!th) return;
    if (th.lang !== this.lang && !this.prefs.showOther) this.setPref('showOther', true);
    if (th.resolved && !this.prefs.showResolved) this.activeId = th.id;
    this.render();
    const p = this.locate(th);
    if (p) {
      const y = Math.max(0, p.y - innerHeight / 3);
      if (window.lenis) window.lenis.scrollTo(y, { immediate: true });
      else scrollTo({ top: y });
    }
    setTimeout(() => this.openThread(th.id), 50);
  }

  openThread(id) {
    const th = this.threads.find((x) => x.id === id);
    if (!th) return;
    const t = this.t;
    if (this.pop) this.pop.remove();
    this.pop = null;
    this.draft = null;
    this.activeId = id;
    this.render();
    history.replaceState(null, '', `${location.pathname}${location.search}#comment-${th.number}`);

    const msg = (author, body, ts, extra) =>
      h(
        'div',
        { class: 'kr-msg' },
        h('div', { class: 'kr-meta' }, h('b', {}, author), h('span', {}, fmtTime(ts, this.lang)), extra),
        h('p', { dir: 'auto' }, body),
      );

    const langTag = h('span', { class: 'kr-tag', title: `${t.otherLang} ${th.lang.toUpperCase()}` }, th.lang.toUpperCase());
    const resolvedTag = th.resolved ? h('span', { class: 'kr-tag res' }, `${t.resolvedBy}${th.resolved_by ? ` · ${th.resolved_by}` : ''}`) : null;

    const toggle = h('button', {
      class: 'kr-icon',
      type: 'button',
      'aria-label': th.resolved ? t.reopen : t.resolve,
      title: th.resolved ? t.reopen : t.resolve,
      'aria-pressed': th.resolved ? 'true' : 'false',
      html: th.resolved ? icon.undo : icon.check,
      onclick: async () => {
        toggle.disabled = true;
        try {
          await this.send('PATCH', `/${th.id}`, { resolved: !th.resolved });
          th.resolved = !th.resolved;
          th.resolved_by = th.resolved ? this.name : null;
          this.openThread(th.id);
        } catch {
          this.toast(t.error);
          toggle.disabled = false;
        }
      },
    });
    const del =
      th.mine || th.client === this.client || this.ownIds().has(th.id)
        ? h('button', {
            class: 'kr-icon',
            type: 'button',
            'aria-label': t.del,
            title: t.del,
            html: icon.trash,
            onclick: async () => {
              if (!confirm(t.delConfirm)) return;
              try {
                await this.send('DELETE', `/${th.id}`, {});
                this.threads = this.threads.filter((x) => x.id !== th.id);
                this.closePop();
              } catch {
                this.toast(t.error);
              }
            },
          })
        : null;

    const head = h(
      'header',
      {},
      h('span', { class: 'kr-num' }, `#${th.number}`),
      langTag,
      resolvedTag,
      h('span', { class: 'kr-sp' }),
      del,
      toggle,
      h('button', { class: 'kr-icon', type: 'button', 'aria-label': t.close, html: icon.close, onclick: () => this.closePop() }),
    );

    const ta = h('textarea', { placeholder: t.replyPh, 'aria-label': t.replyPh, dir: 'auto', maxlength: '2000', rows: '2' });
    const err = h('div', { class: 'kr-err', role: 'alert' });
    const sendBtn = h('button', { class: 'kr-btn primary', type: 'submit' }, t.reply);
    const form = h(
      'form',
      {
        class: 'kr-form',
        onsubmit: async (e) => {
          e.preventDefault();
          const body = ta.value.trim();
          if (!body) return ta.focus();
          sendBtn.disabled = true;
          try {
            const d = await this.send('POST', `/${th.id}/replies`, { body });
            th.replies.push(d.reply);
            this.openThread(th.id);
          } catch {
            err.textContent = t.error;
            sendBtn.disabled = false;
          }
        },
      },
      ta,
      err,
      h('div', { class: 'kr-row' }, h('span', { class: 'kr-kbd' }, this.touch ? '' : t.shortcut), sendBtn),
    );
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) form.requestSubmit();
    });

    const p = this.locate(th);
    const note = p && p.lost ? h('div', { class: 'kr-note' }, t.offPage) : null;
    const wrap = h(
      'div',
      {},
      head,
      note,
      msg(th.author, th.body, th.created_at),
      th.replies.map((r) => msg(r.author, r.body, r.created_at)),
      form,
    );
    this.mountPop(wrap, th._pin);
    if (!this.touch) ta.focus({ preventScroll: true });
  }

  ownIds() {
    // Threads created from this browser during this session (server never returns client ids).
    if (!this._own) {
      try {
        this._own = new Set(JSON.parse(lsGet('kr-own', '[]')));
      } catch {
        this._own = new Set();
      }
    }
    return this._own;
  }

  /* ---------- list ---------- */
  toggleSide(force) {
    const open = force ?? !this.side;
    if (!open) {
      this.side && this.side.remove();
      this.side = null;
      return;
    }
    if (!this.side) {
      this.sideFilter = this.sideFilter || 'open';
      this.side = h('aside', { class: 'kr-ui kr-side', 'data-kr-ui': '', 'data-lenis-prevent': '', dir: this.dir, 'aria-label': this.t.list });
      document.body.append(this.side);
    }
    this.renderSide();
  }

  renderSide() {
    if (!this.side) return;
    const t = this.t;
    const chip = (key, label) =>
      h(
        'button',
        {
          class: 'kr-chip',
          type: 'button',
          'aria-pressed': this.sideFilter === key ? 'true' : 'false',
          onclick: () => {
            this.sideFilter = key;
            this.renderSide();
          },
        },
        label,
      );
    const items = this.threads.filter((th) => (this.sideFilter === 'open' ? !th.resolved : th.resolved));
    const open = this.threads.filter((x) => !x.resolved).length;
    const list = items.length
      ? h(
          'ol',
          {},
          items.map((th) =>
            h(
              'li',
              { class: th.resolved ? 'is-resolved' : '' },
              h(
                'button',
                {
                  type: 'button',
                  'aria-label': `${t.goto}: #${th.number}`,
                  onclick: () => {
                    if (th.lang !== this.lang) {
                      location.href = `/${th.lang}/?comments=1#comment-${th.number}`;
                      return;
                    }
                    if (matchMedia('(max-width: 640px)').matches) this.toggleSide(false);
                    this.openByNumber(th.number);
                  },
                },
                h('span', { class: 'kr-n' }, String(th.number)),
                h(
                  'span',
                  { class: 'kr-li-body' },
                  h(
                    'span',
                    { class: 'kr-meta' },
                    h('b', {}, th.author),
                    ' · ',
                    fmtTime(th.created_at, this.lang),
                    ' ',
                    h('span', { class: 'kr-tag' }, th.lang.toUpperCase()),
                    th.replies.length ? ` · 💬 ${th.replies.length}` : '',
                  ),
                  h('p', { dir: 'auto' }, th.body),
                ),
              ),
            ),
          ),
        )
      : h('p', { class: 'kr-empty' }, t.empty);
    this.side.replaceChildren(
      h(
        'header',
        {},
        h('h2', {}, t.list),
        h('button', { class: 'kr-icon', type: 'button', 'aria-label': t.close, html: icon.close, onclick: () => this.toggleSide(false) }),
      ),
      h(
        'div',
        { class: 'kr-filters' },
        chip('open', `${t.open} (${open})`),
        chip('resolved', `${t.resolved} (${this.threads.length - open})`),
        h(
          'button',
          {
            class: 'kr-chip',
            type: 'button',
            onclick: async () => {
              const ok = await this.askName(true);
              if (ok) this.renderSide();
            },
          },
          `${t.changeName}: ${this.name}`,
        ),
      ),
      list,
    );
  }

  /* ---------- name ---------- */
  askName(change = false) {
    const t = this.t;
    return new Promise((resolve) => {
      const input = h('input', { type: 'text', placeholder: t.namePh, 'aria-label': t.nameTitle, maxlength: '60', autocomplete: 'name', dir: 'auto', value: change ? this.name : null });
      const finish = (ok) => {
        back.remove();
        resolve(ok);
      };
      const form = h(
        'form',
        {
          class: 'kr-form',
          style: 'padding:0',
          onsubmit: (e) => {
            e.preventDefault();
            const v = input.value.trim();
            if (!v) return input.focus();
            this.name = v;
            lsSet(LS_NAME, v);
            finish(true);
          },
        },
        input,
        h(
          'div',
          { class: 'kr-row' },
          h('button', { class: 'kr-btn ghost', type: 'button', onclick: () => finish(false) }, t.cancel),
          h('button', { class: 'kr-btn primary', type: 'submit' }, t.continue),
        ),
      );
      const back = h(
        'div',
        { class: 'kr-ui kr-modal-back', 'data-kr-ui': '', dir: this.dir },
        h('div', { class: 'kr-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'kr-name-title' }, h('h2', { id: 'kr-name-title' }, t.nameTitle), h('p', {}, t.nameHint), form),
      );
      back.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          finish(false);
        }
      });
      document.body.append(back);
      input.focus();
    });
  }

  toast(text) {
    const el = h('div', { class: 'kr-ui kr-toast', 'data-kr-ui': '', role: 'status' }, text);
    document.body.append(el);
    setTimeout(() => el.remove(), 3200);
  }
}

let instance;
/** Entry point used by the launcher. Returns the instance. */
export async function toggleReview(force) {
  if (!instance) instance = new Review();
  const want = force ?? !instance.on;
  if (want && !instance.on) {
    // remember created threads for delete permission
    const origSend = instance.send.bind(instance);
    if (!instance._wrapped) {
      instance._wrapped = true;
      instance.send = async (m, p, b) => {
        const d = await origSend(m, p, b);
        if (m === 'POST' && p === '' && d.thread) {
          const own = instance.ownIds();
          own.add(d.thread.id);
          lsSet('kr-own', JSON.stringify([...own]));
        }
        return d;
      };
    }
    await instance.start();
  } else if (!want && instance.on) instance.stop();
  return instance;
}
