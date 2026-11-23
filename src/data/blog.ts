/**
 * The three latest posts of the real Kolbassnik blog (https://kolbassnik.com/blogs/колбасник), fetched 23 Nov 2026.
 * Titles, dates, excerpts and quotes are verbatim from the articles. Covers on the site are AI-generated,
 * so the homepage uses typographic cards with Artyom's own pull-quotes instead of images.
 * Articles exist only in Russian; the Hebrew page translates the card text and labels the link as Russian.
 */
const B = 'https://kolbassnik.com/blogs/%D0%BA%D0%BE%D0%BB%D0%B1%D0%B0%D1%81%D0%BD%D0%B8%D0%BA';

export interface Post {
  slug: string;
  url: string;
  date: string; // ISO
  title: { ru: string; he: string };
  excerpt: { ru: string; he: string };
  quote?: { ru: string; he: string };
  tag: { ru: string; he: string };
}

export const POSTS: Post[] = [
  {
    slug: 'kebab-mizrahi-marokanskiy',
    url: `${B}/kebab-mizrahi-marokanskiy`,
    date: '2026-04-24T08:11:18+03:00',
    title: { ru: 'Кебаб по марокански', he: 'קבב מרוקאי' },
    excerpt: {
      ru: 'Сочный, ароматный и насыщенный по вкусу кебаб мизрахи в ближневосточном стиле. Один из рабочих приёмов – очень холодная содовая вода.',
      he: 'קבב מזרחי עסיסי, ריחני ועשיר בטעמים. אחד הטריקים שעובדים: מי סודה קרים מאוד.',
    },
    tag: { ru: 'Рецепт', he: 'מתכון' },
  },
  {
    slug: 'belok-uderzhivaet-zhir-v-kolbase',
    url: `${B}/belok-uderzhivaet-zhir-v-kolbase`,
    date: '2026-03-23T18:55:56+02:00',
    title: { ru: 'Как белок удерживает жир в колбасе', he: 'איך החלבון מחזיק את השומן בנקניק' },
    excerpt: {
      ru: 'Жир должен быть связан белком, а не просто перемешан с мясом.',
      he: 'השומן צריך להיות קשור לחלבון, ולא סתם מעורבב עם הבשר.',
    },
    quote: {
      ru: 'Белок – каркас, жир – наполнитель, температура – момент истины.',
      he: 'החלבון הוא השלד, השומן הוא המילוי, והטמפרטורה היא רגע האמת.',
    },
    tag: { ru: 'Технология', he: 'טכנולוגיה' },
  },
  {
    slug: 'tehnogost',
    url: `${B}/tehnogost`,
    date: '2026-03-13T17:50:28+02:00',
    title: {
      ru: 'Почему нельзя просто копировать заводские технологии на домашней кухне',
      he: 'למה אי אפשר פשוט להעתיק טכנולוגיות של מפעל למטבח הביתי',
    },
    excerpt: {
      ru: 'Дело не в том, что рецепты плохие. Дело в том, что условия производства принципиально разные.',
      he: 'הבעיה היא לא שהמתכונים גרועים. הבעיה היא שתנאי הייצור שונים מהיסוד.',
    },
    quote: {
      ru: 'Технология – это не набор шагов. Это система причин и следствий.',
      he: 'טכנולוגיה היא לא רשימת שלבים. היא מערכת של סיבות ותוצאות.',
    },
    tag: { ru: 'Разбор', he: 'ניתוח' },
  },
];
