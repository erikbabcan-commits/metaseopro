import type { ReactNode } from "react";
import { LEGAL, LEGAL_MAILTO } from "@/lib/legal";

/*
 * Slovak SaaS template texts. They describe only what the application actually does
 * (verified in code: Supabase auth/DB, Stripe billing, Mistral AI, Semrush, Google Search
 * Console, Google Fonts, `locale` cookie, localStorage/sessionStorage keys). They are a
 * TEMPLATE and must be reviewed by a lawyer; open decisions are marked TODO-ERIK.
 */

function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-title-lg text-title-lg font-bold text-text-primary pt-4">{children}</h2>
  );
}

function Operator() {
  return (
    <ul className="list-disc pl-6 space-y-1" data-testid="legal-operator">
      <li>Prevádzkovateľ: {LEGAL.name}</li>
      <li>Sídlo: {LEGAL.address}</li>
      <li>IČO: {LEGAL.ico}</li>
      <li>DIČ: {LEGAL.dic}</li>
      <li>
        E-mail:{" "}
        <a className="text-primary hover:underline" href={LEGAL_MAILTO}>
          {LEGAL.email}
        </a>
      </li>
    </ul>
  );
}

export function TermsContent() {
  return (
    <>
      <p>Účinné od: {LEGAL.updatedAt}</p>
      <H2>1. Prevádzkovateľ</H2>
      <Operator />
      <H2>2. Predmet služby</H2>
      <p>
        Seo4web (seo.vorkei.com) je online nástroj na SEO analýzu webov a e-shopov: audit domény,
        Content Decay Radar, generovanie obsahu pomocou umelej inteligencie a prepojenie s Google
        Search Console. Služba je poskytovaná „tak, ako je“ a výstupy majú informatívny charakter.
      </p>
      <H2>3. Registrácia a účet</H2>
      <p>
        Na používanie služby je potrebný účet (e-mail a heslo alebo prihlásenie cez Google/Apple).
        Používateľ zodpovedá za pravdivosť údajov a za ochranu prístupových údajov.
      </p>
      <H2>4. Platené plány a platby</H2>
      <p>
        Platené plány a ich ceny sú uvedené v cenníku na úvodnej stránke. Platby a správu
        predplatného zabezpečuje Stripe; údaje o platobnej karte sa k prevádzkovateľovi nedostanú.
        Predplatné sa obnovuje podľa zvoleného obdobia, kým ho používateľ nezruší v zákazníckej zóne
        (Stripe Customer Portal). Faktúry sú vystavované podľa platných právnych predpisov.
        TODO-ERIK: doplniť pravidlá vrátenia platby a skúšobného obdobia.
      </p>
      <H2>5. Pravidlá používania</H2>
      <p>
        Je zakázané zneužívať službu, obchádzať limity plánu, analyzovať weby bez oprávnenia ich
        prevádzkovateľa alebo cez službu šíriť nezákonný obsah. Prevádzkovateľ môže pri porušení
        pravidiel prístup obmedziť alebo zrušiť.
      </p>
      <H2>6. Obsah generovaný AI</H2>
      <p>
        Texty a odporúčania generuje umelá inteligencia a môžu obsahovať chyby. Používateľ je
        povinný ich pred zverejnením skontrolovať; prevádzkovateľ nezaručuje konkrétny výsledok
        (napríklad poradie vo vyhľadávači).
      </p>
      <H2>7. Zodpovednosť</H2>
      <p>
        Prevádzkovateľ zodpovedá za škodu v rozsahu vyžadovanom právnymi predpismi. Nezodpovedá za
        výpadky služieb tretích strán (Google, Stripe, poskytovatelia hostingu a AI) ani za nepriamu
        škodu a ušlý zisk, ak to zákon pripúšťa.
      </p>
      <H2>8. Ukončenie a odstúpenie od zmluvy</H2>
      <p>
        Používateľ môže účet zrušiť kedykoľvek. Spotrebiteľ má právo na odstúpenie od zmluvy podľa
        zákona č. 102/2014 Z. z. TODO-ERIK: doplniť lehotu, spôsob odstúpenia a súhlas s okamžitým
        poskytnutím digitálneho obsahu.
      </p>
      <H2>9. Ochrana údajov</H2>
      <p>
        Spracúvanie osobných údajov popisuje dokument Ochrana osobných údajov a Cookies dostupný v
        pätičke webu.
      </p>
      <H2>10. Riešenie sporov a rozhodné právo</H2>
      <p>
        Zmluvný vzťah sa riadi právom Slovenskej republiky. Spotrebiteľ sa môže obrátiť na Slovenskú
        obchodnú inšpekciu alebo využiť platformu ODR (ec.europa.eu/consumers/odr).
      </p>
      <H2>11. Zmeny podmienok a kontakt</H2>
      <p>
        Podmienky môžu byť aktualizované; o podstatných zmenách budú používatelia informovaní.
        Otázky posielajte na{" "}
        <a className="text-primary hover:underline" href={LEGAL_MAILTO}>
          {LEGAL.email}
        </a>
        .
      </p>
    </>
  );
}

export function PrivacyContent() {
  return (
    <>
      <p>Účinné od: {LEGAL.updatedAt}</p>
      <H2>1. Prevádzkovateľ</H2>
      <Operator />
      <H2>2. Aké údaje spracúvame</H2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Účet: e-mail, identifikátor používateľa, údaje z prihlásenia cez Google/Apple.</li>
        <li>
          Fakturačné údaje: meno/firma, adresa, IČO, DIČ, IČ DPH, e-mail (ak ich zadáte v sekcii
          fakturácie).
        </li>
        <li>
          Obsah používania: zadané domény a URL, výsledky auditov, briefy, plány a vygenerované
          texty, nastavenia whitelabel/agentúry.
        </li>
        <li>
          Údaje z Google Search Console, ak pripojenie povolíte (iba na čítanie, podľa vášho
          udelenia).
        </li>
        <li>
          Platobné údaje: spracúva Stripe; my uchovávame len identifikátory zákazníka a predplatného
          a stav platby.
        </li>
        <li>Technické údaje: IP adresa a záznamy o chybách potrebné na bezpečnosť a prevádzku.</li>
      </ul>
      <H2>3. Účel a právny základ</H2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Poskytovanie služby a správa účtu: plnenie zmluvy (čl. 6 ods. 1 písm. b GDPR).</li>
        <li>
          Platby, fakturácia a účtovníctvo: plnenie zmluvy a zákonná povinnosť (čl. 6 ods. 1 písm. b
          a c).
        </li>
        <li>Bezpečnosť a prevencia zneužitia: oprávnený záujem (čl. 6 ods. 1 písm. f).</li>
        <li>Prepojenie s Google Search Console: váš súhlas (čl. 6 ods. 1 písm. a), odvolateľný.</li>
      </ul>
      <H2>4. Sprostredkovatelia a príjemcovia</H2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Supabase / Lovable Cloud: databáza a autentifikácia.</li>
        <li>Stripe: platby a predplatné.</li>
        <li>Mistral AI: generovanie textov (odosielajú sa zadané podklady a texty, nie heslá).</li>
        <li>Semrush: dáta pre SEO audit (odosielajú sa analyzované domény).</li>
        <li>Google: prihlásenie, Search Console API a písma Google Fonts.</li>
        <li>SuperFaktúra: vystavovanie faktúr, ak je funkcia zapnutá.</li>
        <li>
          Poskytovateľ hostingu (Cloudflare / Vercel): TODO-ERIK potvrdiť produkčného poskytovateľa.
        </li>
      </ul>
      <p>
        Niektorí z nich môžu údaje prenášať mimo EHP; prenos je zabezpečený štandardnými zmluvnými
        doložkami alebo rozhodnutím o primeranosti. TODO-ERIK: overiť zmluvy so sprostredkovateľmi.
      </p>
      <H2>5. Doba uchovávania</H2>
      <p>
        Údaje účtu uchovávame po dobu trvania účtu a následne po nevyhnutnú dobu. Účtovné doklady
        uchovávame po dobu určenú zákonom. TODO-ERIK: doplniť konkrétne lehoty.
      </p>
      <H2>6. Vaše práva</H2>
      <p>
        Máte právo na prístup k údajom, opravu, vymazanie, obmedzenie spracúvania, prenosnosť,
        námietku proti spracúvaniu a odvolanie súhlasu. Žiadosť pošlite na{" "}
        <a className="text-primary hover:underline" href={LEGAL_MAILTO}>
          {LEGAL.email}
        </a>
        . Máte tiež právo podať sťažnosť Úradu na ochranu osobných údajov SR
        (dataprotection.gov.sk).
      </p>
      <H2>7. Bezpečnosť</H2>
      <p>
        Údaje chránime šifrovaným prenosom, riadením prístupu na úrovni databázy a obmedzením
        prístupu k tajným kľúčom na serverovú stranu.
      </p>
    </>
  );
}

export function CookiesContent() {
  return (
    <>
      <p>Účinné od: {LEGAL.updatedAt}</p>
      <p>
        Seo4web nepoužíva reklamné ani analytické cookies a neobsahuje sledovacie skripty tretích
        strán. Využívame iba nevyhnutné a funkčné úložisko vo vašom prehliadači, na ktoré sa podľa
        zákona o elektronických komunikáciách nevyžaduje súhlas.
      </p>
      <H2>Prehľad úložiska</H2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border border-border-subtle">
          <thead className="bg-surface-container">
            <tr>
              <th className="p-2">Názov</th>
              <th className="p-2">Typ</th>
              <th className="p-2">Účel</th>
              <th className="p-2">Platnosť</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border-subtle">
              <td className="p-2">locale</td>
              <td className="p-2">cookie</td>
              <td className="p-2">Uloženie zvoleného jazyka (sk/en/de).</td>
              <td className="p-2">1 rok</td>
            </tr>
            <tr className="border-t border-border-subtle">
              <td className="p-2">sb-…-auth-token</td>
              <td className="p-2">localStorage</td>
              <td className="p-2">Prihlásenie (relácia Supabase).</td>
              <td className="p-2">Do odhlásenia</td>
            </tr>
            <tr className="border-t border-border-subtle">
              <td className="p-2">seo4web:auth-redirect</td>
              <td className="p-2">sessionStorage</td>
              <td className="p-2">Návrat na požadovanú stránku po prihlásení.</td>
              <td className="p-2">Do zatvorenia karty</td>
            </tr>
            <tr className="border-t border-border-subtle">
              <td className="p-2">seo4web_ios_prompt_dismissed</td>
              <td className="p-2">localStorage</td>
              <td className="p-2">Zapamätanie zatvorenia výzvy na inštaláciu na iOS.</td>
              <td className="p-2">Do vymazania</td>
            </tr>
          </tbody>
        </table>
      </div>
      <H2>Tretie strany</H2>
      <p>
        Písma sa načítavajú zo služby Google Fonts, čím sa Googlu odovzdá vaša IP adresa. Pri platbe
        vás presmerujeme na stránky Stripe, ktoré môžu používať vlastné cookies podľa svojich zásad.
        Pri prihlásení cez Google alebo Apple platia zásady daného poskytovateľa.
      </p>
      <H2>Správa úložiska</H2>
      <p>
        Cookies a lokálne úložisko môžete kedykoľvek zmazať v nastaveniach prehliadača; po zmazaní
        sa budete musieť znova prihlásiť. Otázky:{" "}
        <a className="text-primary hover:underline" href={LEGAL_MAILTO}>
          {LEGAL.email}
        </a>
        .
      </p>
    </>
  );
}
