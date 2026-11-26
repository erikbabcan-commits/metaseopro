# Zjednotenie cien a trialu: plán. ČAKÁ NA ERIKOVO POTVRDENIE
Dátum: 2026-11-26 (Europe/Bratislava). Báza: main 21044cb. Vetva: `fix/pricing-unify` (iba lokálne, NEMERGOVAŤ).
Stav: **cenník 99 € + 39 € bez DPH za každú ďalšiu stránku Erik v tejto vetve NEPOTVRDIL.** Je to návrh na jeho rozhodnutie.

## Mapa miest s cenou alebo trialom (21044cb)
| Miesto | Čo ukazuje dnes | Účtuje sa? | V tejto vetve |
|---|---|---|---|
| `src/components/landing/LandingPricing.tsx` | Starter 19 €, Pro 29 € + 6,5 €/doména, Agency 99 € + 3,5 €/doména, -20 % ročne, „Vyskúšať Pro na 14 dní zadarmo“, vymyslené funkcie (tokeny, hodinový crawl, manažér) | nie (iba text) | prepísané na 1 kalkulačku 99 € + 39 €/ďalšia stránka bez DPH, žiadny trial, iba existujúce funkcie |
| `src/routes/dashboard.tsx:565, 965, 998` | „Aktivovať Pro (29 €)“, „29 € / mesiac“, „Pro (29 € / mes.)… až 5 webov“ | nie | text z `pricing-proposal.ts` („až 5 webov“ ostáva, rozhodnúť) |
| `src/routes/decay.tsx:854` | „Pro (29 € / mes.)“ | nie | text z `pricing-proposal.ts` |
| `src/components/PaywallModal.tsx:118–163, 320–352` | Pro 29 €/mes., Agency 290 €/rok, Audit Pass 99 € jednorazovo, Stripe odkaz (29 €) | **áno** cez `PRO_DIRECT_CHECKOUT_URL` / `AUDIT_PASS_CHECKOUT_URL` (buy.stripe.com) | iba Pro label; Agency 290 €/rok a Audit Pass 99 € NEZMENENÉ (otvorené otázky) |
| `src/lib/slovak-billing.ts:104–135` (`PLANS`) | Free 0, Pro **39**, Agency **89** €/mes. | **áno**: `billing-checkout.server.ts:148` (unit_amount = priceMonthly×100) a `stripe-reconciliation.server.ts:109` | **NEZMENENÉ** (zmena = zmena účtovanej sumy + Stripe ceny → potrebné Erikovo OK) |
| `src/routes/settings.agency.tsx` (Agency 89 € cez `PLANS`) | 89 € | áno (PLANS) | nezmenené |
| `src/routes/settings.agency.tsx:331` badge „Whitelabel aktívny (Agency Pro)“ aj pre Free | – | – | samostatná oprava `fix/whitelabel-badge-plan` (nezávisí od cenníka) |
| `src/routes/login.tsx:169` „Začni s prvým 30-dňovým plánom zadarmo.“ | **nie je trial**, je to 30-dňový obsahový plán (prvý zadarmo, `content-plan.functions.ts:75`) | – | nezmenené; „signup 30 dní“ z live verdiktu je nedorozumenie, odporúčam iba preformulovať, ak mätie |
| `src/routes/raketa.tsx:85–109`, `brief.tsx:85–109`, `plan.tsx:95,141` (129,90 € …) | ukážkové ceny produktov v demo dátach | nie | nezmenené |
| `raketa.tsx:746,1585`, `plan.tsx:89–201`, `decay.tsx:478,529`, `serplab.tsx:960`, `settings.agency.tsx:680` | vymyslené „úspory PPC“, „~2 890 €“, „14 dní“ záchrany | nie | nezmenené: patrí do ďalšej opravy falošných čísel (P2) |

## Otázky na Erika (bez odpovede sa nemerguje)
1. 99 € + 39 € bez DPH: **mesačne**, alebo jednorazovo? Čo je „stránka“: doména, alebo projekt?
2. Trial: žiadny, 14, alebo 30 dní?
3. Ostáva plán Free (1 web, 3 domény v audite)? Ostáva Agency (89 €/mes. alebo 290 €/rok?) a Audit Pass 99 € jednorazovo?
4. Stripe: vytvorí Erik nové ceny (99 € base + 39 € quantity) a payment linky? Bez nich by web ukazoval 99 € a Stripe by účtoval 29/39 €.

## Po potvrdení (samostatné commity, každý s Bora + TIC TAC gate)
a) `slovak-billing.ts` PLANS + `billing-checkout.server.ts` per-site quantity (line_items quantity = počet stránok); b) nové Stripe price ID v env (NEEDS ERIK); c) PaywallModal Agency/Audit Pass; d) testy billing-checkout/reconciliation na nové sumy.
