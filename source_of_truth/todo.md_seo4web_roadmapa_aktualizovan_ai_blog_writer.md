# 📋 TODO.md — SEO4WEB Plán Realizácie & Roadmapa

Tento plán slúži ako prehľadný checklist a architektonický stav pre vývoj, dizajn a prepojenie všetkých modulov platformy **SEO4WEB** (desktop aj mobilné zobrazenie 390px).

---

## 🚀 Fáza 1: Globálny Shell & Spoločné Komponenty
- [x] **Dizajnový systém tokenov:** Definícia farieb (`#1a73e8`, `#10b981`, `#fbbc04`, `#ea4335`), tieňov, Google Search Clarity vizuálu a typografie (Roboto Flex / Google Sans).
- [x] **`AppHeader`:**
  - [x] Responzívny sticky header s viacfarebným Google-style logom `Seo4web`.
  - [x] Prepínač jazyka a menovej lokality (`SK / EUR`).
  - [x] Projektový dropdown switcher (`mojeshop.sk`).
  - [x] Indikátor systémového stavu (`Všetky služby v prevádzke 100% SLA`).
  - [x] Notifikačný zvonček a profilový avatar.
- [x] **`TopBarLaserLoader` & GSC Sync:**
  - [x] Zelený status konektivity Google Search Console a sledovanie API kvót.
- [x] **Navigačný Shell (Desktop & Mobile):**
  - [x] **Desktop Sidebar:** Persistentná bočná lišta s navigáciou (Dashboard, SEO Raketa, Content Decay, Hĺbkový Audit, Obsahový Plán, AI Blog Writer, AI Briefy, História & Archív, Nastavenia & API) a live ukazovateľom API kvóty (14 250 / 20 000).
  - [x] **Mobile Tab Bar (390px):** Spodný ergonomický dok (Dashboard, SEO Raketa, Decay Radar, Kalendár).

---

## 🏠 Fáza 2: Obrazovky & Kľúčové Moduly

### 1. Landing Page & Kalkulačka (`/`)
- [x] **Mobilná landing page (390px):** Autentický Google Search Console minimalizmus, CTA, metriky.
- [x] **Desktopová landing page:** Interaktívny dynamický kalkulátor počtu domén (+39 € / doména), 4-stĺpcový cenový cenník a konverzný SaaS layout.
- [ ] **AI Blog Writer Sekcia na Landing Page:** Interaktívny input s ukážkou streamovania článku v reálnom čase (SSE stream).
- [ ] **SerpLab Sandbox:** Samostatný pieskoviskový editor Google SERP snippetu s rich snippetmi.

### 2. AI SEO Command Center (`/dashboard`)
- [x] **Desktop Dashboard:**
  - [x] Tactile segmented bar a projektové prepínanie.
  - [x] KPI karty (SEO Health Score 88/100, Organická návštevnosť, Priemerná pozícia, CTR).
  - [x] Grafy organiky a príležitosti k rastu.
- [x] **Mobilná verzia (390px):**
  - [x] Swipe KPI karty, zoznam rýchlych optimalizácií a stav kvót.

### 3. SEO Raketa (`/raketa`)
- [x] **Desktopová verzia:**
  - [x] 4-krokový automatický 1-Click workflow (Analýza URL -> Konkurencia -> AI Brief -> Zaradenie do kalendára).
  - [x] Kvantifikovaný potenciál návštevnosti (+1 450 návštev / ~870 € hodnota v Ads).
- [x] **Mobilná verzia (390px):**
  - [x] Kompaktná kroková vizualizácia s 1-klikom na spustenie celej pipeline.

### 4. Content Decay Radar (`/decay` / `/radar`)
- [x] **Desktopová verzia:**
  - [x] Detekcia klesajúcich URL (30/90 dní prepady), traffic loss metriky (-240 návštev/týždeň).
  - [x] Záchranný AI plán: H2 úpravy, sémantické LSI kľúčové slová, obnova interných odkazov.
  - [x] WCAG 2.1/2.2 AA audit a implementácia prístupnosti.
- [x] **Mobilná verzia (390px):**
  - [x] Prevzdušnená mobilná verzia s jednoduchou aktiváciou záchranných opráv na dotyk.

### 5. Hĺbkový Audit Domén & Konkurencie (`/audit`)
- [x] **Desktopová verzia:**
  - [x] Porovnanie domény s 3 konkurentmi (GymBeam, Namaximum, BiotechUSA).
  - [x] Domain Authority, Keyword Gap (312 chýbajúcich tém), Backlink Gap a Core Web Vitals audit.
- [x] **Mobilná verzia (390px):**
  - [x] Posuvné porovnávacie benchmark karty domén, Keyword Gap karty s 1-klik tvorbou briefov a mobilné Core Web Vitals (LCP 2.1s, INP 95ms, CLS 0.04).

### 6. 30-Dňový Obsahový Kalendár (`/plan`)
- [x] **Desktopová verzia:**
  - [x] Mesačný grid a publikačný harmonogram na 30 dní.
  - [x] Karty článkov s prioritami, AI stavmi (Draft, Ready, Published) a SEO pripravenosťou (94/100).
- [x] **Mobilná verzia (390px):**
  - [x] Týždenný posuvný zoznam naplánovaných publikácií s rýchlym náhľadom tém a autorov.

### 7. AI SEO Brief Generátor (`/brief`)
- [x] **Desktopová verzia:**
  - [x] Kompletná osnova článku pre copywritera (H1-H3), Search Intent, KD 49, LSI entity a PAA otázky.
  - [x] Export do Google Docs, Klientskeho PDF, Markdown a sync do Shoptetu.
- [x] **Mobilná verzia (390px):**
  - [x] Google SERP mobilný náhľad, kopírovanie kľúčových slov, schvaľovací workflow briefu a tímový lock.

### 8. Interaktívny AI Blog Writer & Real-Time SEO Editor (`/writer`)
- [x] **Desktopová verzia:**
  - [x] WYSIWYG editor v Google Docs dizajne s formátovacou lištou a prepojením na Brief #084.
  - [x] Simulácia živého AI streamovania (Claude 3.5 Sonnet @ 284 t/s) s priamym generovaním odsekov.
  - [x] Živý SEO Copilot inšpekčný panel: SEO Content Score (94/100, +32 b.), sledovanie kľúčových slov, LSI entít a chýbajúcich sekcií.
  - [x] Google SERP Snippet náhľad a obojstranná synchronizácia so Shoptet Blogom.
- [x] **Mobilná verzia (390px):**
  - [x] Segmentované prepínanie pohľadov (Editor článku, SEO Copilot 94/100, SERP & Snippet).
  - [x] Kompaktná Google Docs mobilná lišta, optimalizované obrázky s AI alt tagmi a e-shop produktové boxy.
  - [x] AI streamovací blok v reálnom čase s ovládacími akciami (Pozastaviť, Zahodiť, Ponechať) a plávajúci Gemini Copilot riadok.

### 9. História & Archív Výstupov (`/history`)
- [x] **Desktopová verzia:**
  - [x] Kompletný archív 148 vygenerovaných assetov s filtrami kategórií (AI Briefy, Audity, Články, Kalendáre).
  - [x] Inšpekčný bočný panel s live SERP náhľadom, históriou revízií a 1-klik exportmi.
- [x] **Mobilná verzia (390px):**
  - [x] Kompaktný 2×2 KPI súhrn, mobilné karty s priamymi exportnými dlaždicami (Docs, PDF, Shoptet, MD).

### 10. Nastavenia & API Integrácie (`/settings`)
- [x] **Desktopová verzia:**
  - [x] Prepojené platformy: Google Search Console (OAuth 2.0, 1 450 indexovaných URL), Shoptet API v2.4 (obojstranný auto-sync blogu a meta tagov), WordPress konektor.
  - [x] Produkčné API kľúče a automatizačné webhooky (Make, Zapier) s testom odozvy (200 OK).
  - [x] AI kvóty & modely (Claude 3.5 Sonnet, GPT-4o, Deep Crawl Engine).
  - [x] Alerty poklesov (E-mail, SMS / WhatsApp) a tímový manažment (3/5 používateľov).
- [x] **Mobilná verzia (390px):**
  - [x] Prehľad konektorov s dotykovými Material switchmi (Auto-Sync, auto-oprava meta tagov), overenie GSC kvót a správa tímových rolí.

---

## 🔮 Fáza 3: Zostávajúce Rozšírenia & Pokročilé Moduly

- [ ] **Agentúrny Whitelabel Hub (`/settings/agency`):**
  - [ ] Konfigurátor vlastného brandu (logo agentúry, vlastné brandové farby, vlastná subdoména).
  - [ ] Generátor interaktívnych klientskych reportov s 1-klik zdieľaním chráneným heslom.
- [ ] **SerpLab Sandbox (`/serplab`):**
  - [ ] Samostatný interaktívny simulátor a vizualizátor Google rich snippetov (FAQ schema, Recipe, Product rating, Sitelinks, Video).
- [ ] **Landing Page: Live AI Writer Demo Widget:**
  - [ ] Interaktívna sekcia na úvodnej stránke demonštrujúca návštevníkom bleskové generovanie optimalizovaného odseku pre zadané kľúčové slovo.

---

## 📊 Celkový Stav Implementácie
- **Dokončené obrazovky (Desktop):** 8 / 8 hlavných modulov (`Landing`, `Dashboard`, `Raketa`, `Decay`, `Audit`, `Kalendár`, `Brief`, `Writer`, `História`, `Nastavenia`).
- **Dokončené obrazovky (Mobile 390px):** 8 / 8 hlavných modulov (`Landing`, `Dashboard`, `Raketa`, `Decay`, `Audit`, `Kalendár`, `Brief`, `Writer`, `História`, `Nastavenia`).
- **Dizajnová konzistencia:** 100% zosúladené s tokenmi Google Search Clarity, Material You a čistým firemným UX.
