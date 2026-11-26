# Zjednotenie cien a trialu — potvrdený zobrazovaný cenník

Dátum: 2026-11-26 (Europe/Bratislava). Báza: main 21044cb. Vetva: `fix/pricing-unify` (PR #15).
Stav zobrazenia: **Erik 26. 11. 2026 o 23:05 (Europe/Bratislava) potvrdil doslovne cez TIC TAC: „Potvrdzujem 99 € + 39 € bez DPH, trial 14 dní.“**
Stav účtovania: **NEZMENENÉ.** Stripe, env ani `PLANS` (Pro 39 €, Agency 89 €, bez `trial_period_days`) tento commit nemení. Zobrazená cena a trial sa preto zatiaľ nezhodujú s tým, čo Stripe naúčtuje. Merge zobrazenia pred úpravou Stripe znamená, že web sľúbi inú cenu a trial, než aké prebehnú pri platbe.

## Potvrdené

- 99 € bez DPH za prvú stránku + 39 € bez DPH za každú ďalšiu stránku.
- Trial 14 dní.

## Stále otvorené (Erik v potvrdení nespomenul)

1. Je 99 € + 39 € **mesačný** predplatný, alebo jednorazový poplatok? (v UI predpokladáme mesačne, ako doteraz.)
2. Čo je „stránka“: doména, projekt, alebo niečo iné?
3. Ostáva plán Free (1 web, 3 domény v audite)? Ostáva Agency ako samostatný balík? Ostáva Audit Pass 99 € jednorazovo? (v UI Agency ukazuje ten istý 99+39 model; Audit Pass 99 € jednorazovo ostáva, lebo ho Erik nepotvrdil ani nezrušil.)
4. Stripe: nové Price ID (99 € základ + 39 € za ďalšiu stránku, **bez DPH**), 14-dňový `trial_period_days` a nové payment linky musí nastaviť Erik. Bez toho web ukazuje 99 € + 14 dní a Stripe účtuje hneď 39/89 € (alebo sumu na starom payment linku).

## Mapa zobrazenia po tomto commite

| Miesto                                                                                                                                 | Zobrazuje                                                                                             | Účtuje sa?                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LandingPricing.tsx`                                                                                                                   | kalkulačka 99 € + 39 €/ďalšia stránka bez DPH, „Prvých 14 dní zadarmo“, CTA „Vyskúšať 14 dní zadarmo“ | nie (iba text)                                                                                                                                                                    |
| `dashboard.tsx`, `decay.tsx`, `PaywallModal.tsx`, `settings.agency.tsx`, `billing-ui.ts` (`checkoutPlanLabel`)                         | Pro/Agency 99 € + 39 € bez DPH, trial 14 dní                                                          | nie (iba text)                                                                                                                                                                    |
| `login.tsx:169`                                                                                                                        | „30-dňový obsahový plán“ (produkt, nie trial predplatného) + veta o 14-dňovom trial predplatného      | obsahový plán zadarmo ostáva v `content-plan.functions.ts`; predplatný trial Stripe nespúšťa                                                                                      |
| `PaywallModal` Audit Pass                                                                                                              | 99 € jednorazovo, link `AUDIT_PASS_CHECKOUT_URL`                                                      | **áno**, cez buy.stripe.com (suma na linku neoverená otvorením checkoutu)                                                                                                         |
| `PLANS` v `slovak-billing.ts`                                                                                                          | Pro **39**, Agency **89** €/mes.                                                                      | **áno**: `billing-checkout.server.ts` `unit_amount = priceMonthly×100`, `tax_behavior: "inclusive"` (s DPH), `quantity: 1` (bez príplatku za stránku), žiadny `trial_period_days` |
| `PRO_DIRECT_CHECKOUT_URL`                                                                                                              | vedľajší Stripe odkaz pri Pro (text ceny na tlačidle sme stiahli)                                     | **áno**, buy.stripe.com (historicky viazaný na 29 €; aktuálnu sumu sme neotvárali)                                                                                                |
| Demo ceny / falošné metriky (`raketa.tsx`, `brief.tsx`, `plan.tsx`, `decay.tsx:478,529`, `serplab.tsx:960`, `settings.agency.tsx:680`) | nie sú cenník predplatného                                                                            | nezmenené (samostatná P2 úloha)                                                                                                                                                   |

## Nesúlad so Stripe (samostatná úloha pre Erika, tento commit ho nerieši)

Pozri sekciu „Nesúlad so Stripe“ v commite / reportes. Navrhovaná follow-up vetva: `fix/stripe-pricing-99-39-trial-14` (NEEDS ERIK: nové Price ID v env, payment linky, až potom zmena `PLANS`, `lineItems`, `trial_period_days` a reconciliačných súm).
