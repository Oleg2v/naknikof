/**
 * Nitrite-salt calculator — CONSERVATIVE reference formula.
 *
 * ⚠️ OWNER REVIEW REQUIRED: dosages must be confirmed by Artyom (kolbassnik.com) before production.
 *
 * Grounding (kolbassnik.com product pages, Nov 2026):
 *  - "Нитритная соль 0,6%" (natrit-sol-0-6-500-v-izraile): 0.6 % NaNO₂ in NaCl. The store gives NO fixed dose:
 *    "Количество нитритной соли рассчитывают с учётом категории продукта, рецептуры и применимых нормативов.
 *     Нитритная соль учитывается в общем количестве соли в изделии." Storage: "отдельно от обычной соли и
 *     в недоступном для детей месте. Применять только в количествах, предусмотренных технологией."
 *  - "Нитритная соль №2 — 0,6 % нитрита и 0,4 % нитрата" (products-nitritnaya-sol-2-0-6-0-4-1kg):
 *    "Рекомендуемая дозировка: 20–25 г на 1 кг мясного сырья."
 *
 * Conservative choice: the calculator never exceeds the LOWER bound of the store's own published range,
 * 20 g per 1 kg of meat. The user may pick a lower recipe salt level (16–20 g/kg); anything above 20 g/kg
 * in a recipe should be regular salt, not more curing salt. NaNO₂ is reported so the result can be checked.
 */
export const NITRITE_SHARE = 0.006; // 0.6 % NaNO₂ in the curing salt (both products)
export const NITRATE_SHARE_NO2 = 0.004; // 0.4 % NaNO₃ in "№2"
export const MAX_G_PER_KG = 20; // lower bound of the store's 20–25 g/kg (salt №2) → hard cap
export const LEVELS = [16, 18, 20] as const; // g of curing salt per kg of meat offered in the UI
export const DEFAULT_LEVEL = 18;

export interface NitriteResult {
  meatKg: number;
  gPerKg: number;
  saltG: number; // grams of curing salt to weigh
  nitriteMg: number; // total NaNO₂ in the batch, mg
  nitriteMgPerKg: number; // NaNO₂ per kg of meat, mg
  nitrateMg: number; // only for salt №2
}

export function calcNitrite(meatKg: number, gPerKg: number, product: 'n06' | 'n2' = 'n06'): NitriteResult {
  const kg = Math.max(0, Math.min(100, Number.isFinite(meatKg) ? meatKg : 0));
  const rate = Math.min(MAX_G_PER_KG, Math.max(0, gPerKg));
  const saltG = kg * rate;
  return {
    meatKg: kg,
    gPerKg: rate,
    saltG,
    nitriteMg: saltG * NITRITE_SHARE * 1000,
    nitriteMgPerKg: rate * NITRITE_SHARE * 1000,
    nitrateMg: product === 'n2' ? saltG * NITRATE_SHARE_NO2 * 1000 : 0,
  };
}
