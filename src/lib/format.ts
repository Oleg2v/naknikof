export type Lang = 'ru' | 'he';

const RU_MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const RU_WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
const HE_WEEKDAYS = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];

/** Parts of a date in Israel time, independent of the build machine's timezone. */
function ilParts(iso: string) {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? '';
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { y: +get('year'), m: +get('month') - 1, d: +get('day'), wd, hh: get('hour'), mm: get('minute') };
}

/** "3 февраля" / "3 בפברואר" (optionally with year). */
export function formatDay(iso: string, lang: Lang, withYear = false) {
  const p = ilParts(iso);
  if (lang === 'ru') return `${p.d} ${RU_MONTHS_GEN[p.m]}${withYear ? ` ${p.y}` : ''}`;
  return `${p.d} ב${HE_MONTHS[p.m]}${withYear ? ` ${p.y}` : ''}`;
}

export function formatWeekday(iso: string, lang: Lang) {
  const p = ilParts(iso);
  return lang === 'ru' ? RU_WEEKDAYS[p.wd] : HE_WEEKDAYS[p.wd];
}

export function formatTime(iso: string) {
  const p = ilParts(iso);
  return `${p.hh}:${p.mm}`;
}

export function dayNumber(iso: string) {
  return ilParts(iso).d;
}
export function monthShort(iso: string, lang: Lang) {
  const p = ilParts(iso);
  return lang === 'ru' ? RU_MONTHS_GEN[p.m].slice(0, 3) : HE_MONTHS[p.m];
}

/** Russian plural: plural(5, ['товар','товара','товаров']) → 'товаров'. */
export function pluralRu(n: number, forms: [string, string, string]) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

/** Hebrew: 1 → singular form, otherwise plural. */
export function pluralHe(n: number, forms: [string, string]) {
  return n === 1 ? forms[0] : forms[1];
}

/** Price in shekels: "80 ₪", "42,50 ₪" (ru) / "‏80 ₪" (he). */
export function formatPrice(v: number, lang: Lang) {
  const s = new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'he-IL', {
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(v);
  return `${s} ₪`;
}
