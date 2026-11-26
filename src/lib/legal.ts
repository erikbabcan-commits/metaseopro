/**
 * Single source of truth for the operator (prevádzkovateľ) identity shown on the
 * legal pages and in the landing footer.
 *
 * Every value below is a PLACEHOLDER. Erik must replace each `TODO-ERIK` value with
 * the real company data before launch. Do not invent values here — `hasLegalPlaceholders()`
 * (and the unit test) make the unfinished state explicit.
 */
export const PLACEHOLDER_MARK = "TODO-ERIK";

export const LEGAL = {
  /** Obchodné meno / meno a priezvisko prevádzkovateľa */
  name: "TODO-ERIK obchodné meno",
  /** Sídlo / adresa prevádzkovateľa */
  address: "TODO-ERIK adresa sídla",
  /** IČO */
  ico: "TODO-ERIK IČO",
  /** DIČ */
  dic: "TODO-ERIK DIČ",
  /** Kontaktný e-mail (používa sa aj v mailto: odkaze v pätičke) */
  email: "TODO-ERIK@example.invalid",
  /** Dátum poslednej aktualizácie dokumentov (TODO-ERIK: nastaviť pri schválení textov) */
  updatedAt: "TODO-ERIK dátum účinnosti",
} as const;

export const LEGAL_MAILTO = `mailto:${LEGAL.email}`;

export const LEGAL_PATHS = {
  terms: "/obchodne-podmienky",
  privacy: "/ochrana-osobnych-udajov",
  cookies: "/cookies",
} as const;

/** True while any operator field still contains the TODO-ERIK placeholder. */
export function hasLegalPlaceholders(): boolean {
  return Object.values(LEGAL).some((v) => v.includes(PLACEHOLDER_MARK));
}
