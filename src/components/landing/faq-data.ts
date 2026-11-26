import { AUDIT_PASS_PRICE_LABEL_VAT, PRO_PRICE_LABEL_VAT } from "@/lib/pricing";

export interface FaqEntry {
  question: string;
  answer: string;
}

/** Single source of truth for the visible landing FAQ and its FAQPage JSON-LD. */
export const faqData: FaqEntry[] = [
  {
    question: "Ako presne funguje Live crawler analýza?",
    answer:
      "Náš crawler v reálnom čase vysiela renderované požiadavky simulujúce Googlebot pre mobilné zariadenia. Analyzuje indexovateľnosť, stavové kódy, canonical tagy, rýchlosť odozvy servera a sémantickú štruktúru nadpisov H1-H6 v priebehu sekúnd.",
  },
  {
    question: "Sú AI texty bezpečné pre Google Helpful Content System?",
    answer:
      "Áno. Náš AI Writer nekopíruje generické frázy. Integruje princípy EEAT (Experience, Expertise, Authoritativeness, Trustworthiness) a priamo do textu prirodzene integruje entity a odpovede na hľadané otázky zákazníkov, čím spĺňa aktuálne usmernenia Google pre tvorbu obsahu.",
  },
  {
    question: "Môžem prepojiť Seo4web s Google Search Console?",
    answer:
      "Jedným klikom cez oficiálne Google OAuth API. Následne automaticky párujeme reálne dáta o kliknutiach, impresiách a pozíciách s našimi technickými zisteniami, vďaka čomu presne vidíte, ktoré chyby vás stoja návštevnosť.",
  },
  {
    question: "Je možné predplatné kedykoľvek zrušiť alebo zmeniť?",
    answer: `Áno, bez viazanosti a bez skrytých poplatkov. Predplatné Pro stojí ${PRO_PRICE_LABEL_VAT} a môžete ho kedykoľvek zrušiť v správe predplatného vo vašom používateľskom profile. Fast-Track Audit Pass je jednorazová platba ${AUDIT_PASS_PRICE_LABEL_VAT}.`,
  },
];
