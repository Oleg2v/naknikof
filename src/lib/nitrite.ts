/**
 * Nitrite-salt calculator — CONSERVATIVE reference formula.
 *
 * ⚠️ OWNER REVIEW REQUIRED: dosages must be confirmed by Artyom (kolbassnik.com) before production.
 *
 * Every number below is taken from kolbassnik.com itself (fetched 23 Nov 2026), never invented:
 *
 *  Нитритная соль 0,6 % (replaces table salt — «поваренную не добавляем»):
 *   - Шинка-Ветчина: «Нитритная соль 0.6%: 15–17 г (солёность 1.5–1.7%)»
 *   - Кабаносы: «Нитритная соль – 0,6% (15–17 г)»
 *   - Куриный рулет: «Соль нитритная 0,6% — 15 г»; Мортаделла: «15–18 г»;
 *     15 г in Сервелат, Пастрама из индейки, Рулет из грудинки, Гановерская.
 *   → default 15 g/kg, allowed 15–17 g/kg (lower part of the author's own range).
 *
 *  Нитритная соль №2 (0,6 % NaNO₂ + 0,4 % NaNO₃), dry-cured products only:
 *   - product page: «Рекомендуемая дозировка: 20–25 г на 1 кг мясного сырья.»
 *   → default 20 g/kg, allowed 20–25 g/kg.
 *
 * The product page for 0,6 % salt explicitly says the amount depends on product category, recipe and
 * regulations, and that nitrite salt counts towards the total salt — the UI repeats that disclaimer.
 */
export type SaltKind = 'n06' | 'n2';

export const SALTS: Record<SaltKind, { nitrite: number; nitrate: number; min: number; max: number; def: number; step: number }> = {
  n06: { nitrite: 0.006, nitrate: 0, min: 15, max: 17, def: 15, step: 0.5 },
  n2: { nitrite: 0.006, nitrate: 0.004, min: 20, max: 25, def: 20, step: 0.5 },
};

export const MEAT = { min: 0.5, max: 20, step: 0.1, def: 2 };

export interface NitriteResult {
  meatKg: number;
  gPerKg: number;
  saltG: number; // grams of curing salt to weigh
  nitriteMg: number; // NaNO₂ in the batch, mg
  nitriteMgPerKg: number;
  nitrateMg: number; // NaNO₃ in the batch, mg (salt №2 only)
}

export function calcNitrite(meatKg: number, gPerKg: number, kind: SaltKind = 'n06'): NitriteResult {
  const s = SALTS[kind];
  const kg = Math.max(0, Math.min(MEAT.max, Number.isFinite(meatKg) ? meatKg : 0));
  const rate = Math.min(s.max, Math.max(s.min, Number.isFinite(gPerKg) ? gPerKg : s.def));
  const saltG = kg * rate;
  return {
    meatKg: kg,
    gPerKg: rate,
    saltG,
    nitriteMg: saltG * s.nitrite * 1000,
    nitriteMgPerKg: rate * s.nitrite * 1000,
    nitrateMg: saltG * s.nitrate * 1000,
  };
}
