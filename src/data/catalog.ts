/**
 * Catalogue data for the homepage — real products, prices and categories from kolbassnik.com/products.json
 * and collections.json (fetched 23 Nov 2026). Prices in ₪ incl. VAT. "from" = cheapest variant.
 * image: real photo / manufacturer packshot from the store (AI-generated store images are NOT used);
 * null → branded placeholder with a "photo needed" tag.
 */
import type { ImageMetadata } from 'astro';
import almi from '../assets/products/almi-7.jpg';
import devro43 from '../assets/products/devro-43.jpg';
import chipsBox from '../assets/products/chips-maple-box.png';
import tp710 from '../assets/products/thermopro-tp710.jpg';
import bags from '../assets/products/vacuum-bags-ribbed.jpg';
import stuffer from '../assets/products/sausage-stuffer.jpg';
import board from '../assets/products/butcher-board.jpg';

const SHOP = 'https://kolbassnik.com';
const enc = (h: string) => `${SHOP}/products/${encodeURIComponent(h)}`;
const col = (h: string) => `${SHOP}/collections/${encodeURIComponent(h)}`;

export interface Product {
  handle: string;
  url: string;
  title: { ru: string; he: string };
  spec: { ru: string; he: string };
  price: number;
  compareAt?: number;
  from?: boolean;
  available: boolean;
  image: ImageMetadata | null;
  icon: CategoryKey;
}

export type CategoryKey = 'casings' | 'additives' | 'spices' | 'smoking' | 'sousvide' | 'equipment' | 'kits' | 'gift' | 'castiron';

export interface Category {
  key: CategoryKey;
  url: string;
  count: number;
  title: { ru: string; he: string };
  note: { ru: string; he: string };
  stage?: 'casing' | 'stuffing' | 'smoking' | 'slicing';
}

/** Top-level menu of kolbassnik.com, in the order of the sausage-making process. */
export const CATEGORIES: Category[] = [
  {
    key: 'casings',
    url: col('оболочки-для-колбасных-изделий'),
    count: 28,
    title: { ru: 'Колбасные оболочки', he: 'מעטפות לנקניקים' },
    note: { ru: 'Коллагеновые, фиброузные, полиамидные, сетки и шпагаты', he: 'קולגן, פיברוס, פוליאמיד, רשתות וחוטי קשירה' },
    stage: 'casing',
  },
  {
    key: 'additives',
    url: col('добавки'),
    count: 12,
    title: { ru: 'Пищевые добавки для колбас', he: 'תוספי מזון לנקניקים' },
    note: { ru: 'Нитритная соль, фосфаты, стартовые культуры, декстроза', he: 'מלח ניטריט, פוספטים, תרביות מתנע, דקסטרוז' },
    stage: 'stuffing',
  },
  {
    key: 'spices',
    url: col('nabory-specii-kolbasy-izrail-kolbassnik'),
    count: 12,
    title: { ru: 'Специи', he: 'תבלינים' },
    note: { ru: 'Готовые смеси для гриль-колбасок, сервелатов, салями и ветчин', he: 'תערובות מוכנות לנקניקיות גריל, סרוולט, סלמי ובשרים כבושים' },
    stage: 'stuffing',
  },
  {
    key: 'equipment',
    url: col('оборудование'),
    count: 25,
    title: { ru: 'Оборудование и инструменты', he: 'ציוד וכלי עבודה' },
    note: { ru: 'Колбасные шприцы, термометры, весы, доски и мусаты', he: 'ממלאות נקניקים, מדחומים, משקלים, קרשי חיתוך ומוטות השחזה' },
    stage: 'stuffing',
  },
  {
    key: 'smoking',
    url: col('shchepa-dlya-kopcheniya'),
    count: 20,
    title: { ru: 'Гриль, копчение и щепа', he: 'גריל, עישון ושבבי עץ' },
    note: { ru: 'Щепа, стружка для холодного копчения, коптильные коробки и аксессуары для гриля', he: 'שבבי עץ, נסורת לעישון קר, קופסאות עישון ואביזרים לגריל' },
    stage: 'smoking',
  },
  {
    key: 'sousvide',
    url: col('suvid-izrail-tovary'),
    count: 20,
    title: { ru: 'Товары для су-вид', he: 'ציוד לסו־ויד' },
    note: { ru: 'Вакуумные пакеты, контейнеры, грузики и держатели', he: 'שקיות ואקום, מכלים, משקולות ומחזיקים' },
    stage: 'slicing',
  },
  {
    key: 'castiron',
    url: col('chugunaya-posuda'),
    count: 13,
    title: { ru: 'Посуда для жарки и готовки', he: 'כלים לטיגון ולבישול' },
    note: { ru: 'Чугунные сковороды, планчи, казаны и жаровни', he: 'מחבתות ברזל יצוק, פלנצ׳ות, קזאנים וסירי צלייה' },
  },
  {
    key: 'kits',
    url: col('наборы-1'),
    count: 1,
    title: { ru: 'Наборы', he: 'ערכות' },
    note: { ru: 'Набор щепы: бук, ольха, дуб и вишня, 4 × 500 г', he: 'ערכת שבבי עץ: אשור, אלמון, אלון ודובדבן, ‎4×500 גרם' },
  },
  {
    key: 'gift',
    url: col('подарочные-сертификаты'),
    count: 1,
    title: { ru: 'Подарочные сертификаты', he: 'שוברי מתנה' },
    note: { ru: 'Номиналы 100, 200, 350 и 500 ₪', he: 'בסכומים של 100, 200, 350 ו־500 ₪' },
  },
];

export const POPULAR: Product[] = [
  {
    handle: 'быстрые-звезды-сплошной-колбасы',
    url: enc('быстрые-звезды-сплошной-колбасы'),
    title: { ru: 'Стартовые культуры ALMI 7', he: 'תרביות מתנע ALMI 7' },
    spec: { ru: 'на 100 кг сырья · быстрая ферментация', he: 'ל־100 ק״ג חומר גלם · תסיסה מהירה' },
    price: 110,
    available: true,
    image: almi,
    icon: 'additives',
  },
  {
    handle: 'devro-collagen-casing-43mm',
    url: enc('devro-collagen-casing-43mm'),
    title: { ru: 'Коллагеновая оболочка Devro', he: 'מעטפת קולגן Devro' },
    spec: { ru: 'кольцевая · 43 мм · 8 м', he: 'טבעתית · 43 מ״מ · 8 מטר' },
    price: 42,
    available: true,
    image: devro43,
    icon: 'casings',
  },
  {
    handle: 'shchepa-dlya-kopcheniya-klen-hickory-5l',
    url: enc('shchepa-dlya-kopcheniya-klen-hickory-5l'),
    title: { ru: 'Щепа для копчения: клён', he: 'שבבי עץ לעישון: מייפל' },
    spec: { ru: '5 литров · Eco Israel', he: '5 ליטר · Eco Israel' },
    price: 50,
    compareAt: 65,
    available: true,
    image: chipsBox,
    icon: 'smoking',
  },
  {
    handle: 'natrit-sol-0-6-500-v-izraile',
    url: enc('natrit-sol-0-6-500-v-izraile'),
    title: { ru: 'Нитритная соль 0,6 %', he: 'מלח ניטריט 0.6%' },
    spec: { ru: '1 кг · NaCl + 0,6 % NaNO₂', he: '1 ק״ג · NaCl + 0.6% NaNO₂' },
    price: 80,
    available: true,
    image: null,
    icon: 'additives',
  },
  {
    handle: 'thermopro-tp710-dual-probe',
    url: enc('thermopro-tp710-dual-probe'),
    title: { ru: 'Термометр ThermoPro TP710', he: 'מדחום ThermoPro TP710' },
    spec: { ru: '2 щупа · −50…+300 °C', he: '2 מחטים · ‎−50…+300 °C' },
    price: 130,
    available: true,
    image: tp710,
    icon: 'equipment',
  },
  {
    handle: 'bags-vacuum',
    url: enc('bags-vacuum'),
    title: { ru: 'Рифлёные вакуумные пакеты', he: 'שקיות ואקום מחורצות' },
    spec: { ru: '20 × 30 см · 25 / 50 / 100 шт.', he: '20‎×30 ס״מ · 25 / 50 / 100 יח׳' },
    price: 40,
    from: true,
    available: true,
    image: bags,
    icon: 'sousvide',
  },
  {
    handle: 'kolbasnyi-shpric',
    url: enc('kolbasnyi-shpric'),
    title: { ru: 'Колбасный шприц', he: 'ממלאת נקניקים' },
    spec: { ru: '3, 5 или 7 литров', he: '3, 5 או 7 ליטר' },
    price: 770,
    from: true,
    available: true,
    image: stuffer,
    icon: 'equipment',
  },
  {
    handle: 'butcher',
    url: enc('butcher'),
    title: { ru: 'Профессиональная разделочная доска', he: 'קרש חיתוך מקצועי' },
    spec: { ru: '45 × 30 см · торцевая', he: '45‎×30 ס״מ · חתך רוחבי' },
    price: 210,
    available: true,
    image: board,
    icon: 'equipment',
  },
];

/** Products referenced from the "meat → sausage" chapters (real prices). */
export const STAGE_PICKS = {
  casing: { ru: 'Devro 43 мм — 42 ₪', he: 'Devro‏ 43 מ״מ — 42 ₪', url: enc('devro-collagen-casing-43mm') },
  stuffing: { ru: 'Колбасный шприц — от 770 ₪', he: 'ממלאת נקניקים — החל מ־770 ₪', url: enc('kolbasnyi-shpric') },
  smoking: { ru: 'Щепа клён, 5 л — 50 ₪', he: 'שבבי מייפל, 5 ליטר — 50 ₪', url: enc('shchepa-dlya-kopcheniya-klen-hickory-5l') },
  slicing: { ru: 'Разделочная доска 45 × 30 — 210 ₪', he: 'קרש חיתוך 45‎×30‏ — 210 ₪', url: enc('butcher') },
} as const;

/** Where each story chapter leads (real collections). */
export const STAGE_LINKS = {
  casing: col('оболочки-для-колбасных-изделий'),
  stuffing: col('добавки'),
  smoking: col('shchepa-dlya-kopcheniya'),
  slicing: col('ножи-и-разделочные-доски'),
} as const;

export const LINKS = {
  scale: enc('camry-eha701-precision-pocket-scale'),
  salt06: enc('natrit-sol-0-6-500-v-izraile'),
  salt2: enc('products-nitritnaya-sol-2-0-6-0-4-1kg'),
  all: `${SHOP}/collections/all`,
};
