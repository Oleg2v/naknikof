/**
 * Store facts — taken from kolbassnik.com (header banner, contact block, policies), November 2026.
 * Sources:
 *  - https://kolbassnik.com/ (top banner: free delivery from 370 ₪, door delivery 40 ₪, 3–9 business days;
 *    contact block: HaMelakhim 9, Kfar Saba · 053-6242905 · sakromail@gmail.com; WhatsApp support;
 *    "returns within 14 days"; "secure payment")
 *  - https://kolbassnik.com/policies/refund-policy (return within 14 business days, unopened original packaging, by prior arrangement)
 *  - https://kolbassnik.com/pages/contact (working days Sun–Fri, hours by prior arrangement)
 */
export const STORE = {
  name: 'Kolbassnik',
  url: 'https://kolbassnik.com',
  owner: { ru: 'Артём Беркович', he: 'ארטיום ברקוביץ׳' },
  phone: '053-6242905',
  phoneIntl: '+972-53-624-2905',
  whatsapp: 'https://wa.me/972536242905',
  email: 'sakromail@gmail.com',
  address: {
    street: { ru: 'ул. Ха-Мелахим, 9', he: 'רחוב המלכים 9', en: 'HaMelakhim St 9' },
    city: { ru: 'Кфар-Сава', he: 'כפר סבא', en: 'Kfar Saba' },
  },
  maps: 'https://www.google.com/maps/search/?api=1&query=HaMelakhim+9+Kfar+Saba',
  waze: 'https://waze.com/ul?q=HaMelakhim%209%20Kfar%20Saba&navigate=yes',
  shipping: { freeFrom: 370, price: 40, daysMin: 3, daysMax: 9 },
  returnsDays: 14,
  workDays: { from: 0, to: 5 }, // Sunday–Friday, by prior arrangement
  links: {
    blog: 'https://kolbassnik.com/blogs/%D0%BA%D0%BE%D0%BB%D0%B1%D0%B0%D1%81%D0%BD%D0%B8%D0%BA',
    all: 'https://kolbassnik.com/collections/all',
    contact: 'https://kolbassnik.com/pages/contact',
    shipping: 'https://kolbassnik.com/policies/shipping-policy',
    refund: 'https://kolbassnik.com/policies/refund-policy',
    privacy: 'https://kolbassnik.com/policies/privacy-policy',
    terms: 'https://kolbassnik.com/policies/terms-of-service',
    accessibility: 'https://kolbassnik.com/pages/accessibility-statement',
    cart: 'https://kolbassnik.com/cart',
    search: 'https://kolbassnik.com/search',
  },
} as const;

export const waLink = (text?: string) => (text ? `${STORE.whatsapp}?text=${encodeURIComponent(text)}` : STORE.whatsapp);
