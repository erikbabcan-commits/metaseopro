import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

const aiSamples = {
  shoes: {
    expert:
      "Správna bežecká obuv na tvrdý asfalt vyžaduje pokročilé tlmenie EVA penou a neutrálnu pronáciu chodidla pre zníženie záťaže kĺbov pri dlhých tratiach.",
    sales:
      "Objavte revolučnú ľahkosť každého kroku. Naša nová bežecká kolekcia kombinuje maximálnu priedušnosť s bezkonkurenčným prenosom energie pri každom odraze!",
    seoexpert:
      "Najlepšia bežecká obuv 2025: Porovnanie top modelov na cestu a trail s detailným rozborom dropu, hmotnosti a priedušnosti zvršku.",
  },
  coffee: {
    expert:
      "Výberová 100% Arabica z etiópskeho regiónu Yirgacheffe pražená na filter vyniká jemnou aciditou, jazmínovou arómou a komplexným profilom s tónmi bergamotu.",
    sales:
      "Začnite každé ráno zážitkom ako z najlepšej kaviarne. Čerstvo pražené zrná výberovej kávy doručíme priamo k vašim dverám do 24 hodín.",
    seoexpert:
      "Čo je výberová káva (Specialty Coffee)? Sprievodca SCA bodovaním, metódami spracovania a správnou extrakciou pre domáce espresso.",
  },
  seo: {
    expert:
      "Technická optimalizácia e-shopu začína elimináciou duplicitných parametrových URL cez precízne self-referencing kanonické značky a štruktúrované dáta Schema.org.",
    sales:
      "Premeňte návštevníkov na platiacich zákazníkov. Získajte viac neplatenej návštevnosti z Google vďaka špičkovej optimalizácii kategórií.",
    seoexpert:
      "Kompletný SEO audit pre e-shopy: Riešenie indexácie fasetovej navigácie, zrýchlenie Core Web Vitals a maximalizácia CTR v organických výsledkoch.",
  },
};

type TopicKey = "shoes" | "coffee" | "seo";
type ToneKey = "expert" | "sales" | "seoexpert";

export function LandingAiWriterDemo() {
  const [topic, setTopic] = useState<TopicKey>("shoes");
  const [tone, setTone] = useState<ToneKey>("expert");
  const [displayedText, setDisplayedText] = useState(aiSamples.shoes.expert);
  const [isStreaming, setIsStreaming] = useState(false);
  const [wordCount, setWordCount] = useState(22);
  const [tokenCount, setTokenCount] = useState(31);
  const [score, setScore] = useState(94);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startStream = (targetTopic = topic, targetTone = tone) => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }

    const fullText = aiSamples[targetTopic][targetTone];
    const words = fullText.split(" ");
    let wordIdx = 0;

    setDisplayedText("");
    setIsStreaming(true);
    setScore(Math.floor(Math.random() * 4) + 93);

    streamIntervalRef.current = setInterval(() => {
      if (wordIdx < words.length) {
        setDisplayedText((prev) => (wordIdx === 0 ? words[0] : `${prev} ${words[wordIdx]}`));
        wordIdx++;
        setWordCount(wordIdx);
        setTokenCount(Math.round(wordIdx * 1.35));
      } else {
        if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
        setIsStreaming(false);
      }
    }, 45);
  };

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, []);

  const handleTopicChange = (newTopic: TopicKey) => {
    setTopic(newTopic);
    startStream(newTopic, tone);
  };

  const handleToneChange = (newTone: ToneKey) => {
    setTone(newTone);
    startStream(topic, newTone);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24" id="ai-writer">
      <div className="bg-surface-pure border border-border-default rounded-3xl p-6 sm:p-10 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 pb-6 border-b border-border-subtle">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary-container text-[20px]">
                smart_toy
              </span>
              <span className="font-label-md text-label-md uppercase tracking-wider text-primary font-bold">
                Live AI Writer Demo
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md text-text-primary font-semibold">
              Generovanie obsahu optimalizovaného pre Google
            </h2>
            <p className="font-body-md text-body-md text-text-secondary mt-1">
              Otestuj generovanie sémantických odsekov a EEAT metrík v reálnom čase.
            </p>
          </div>

          {/* Dynamic Score Indicator Badge */}
          <div className="inline-flex items-center gap-3 bg-surface-container-low px-4 py-2.5 rounded-2xl border border-border-default self-start lg:self-center">
            <span className="pulse-laser w-3 h-3 rounded-full bg-google-green" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-title-md text-title-md font-bold text-text-primary">
                  {score}/100
                </span>
                <span className="font-label-sm text-label-sm text-secondary font-medium">
                  Excelentné
                </span>
              </div>
              <p className="font-label-sm text-label-sm text-text-secondary">
                Optimalizované pre Google
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Topic Pills & Tone selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Quick topic selector pills */}
          <div>
            <label className="block font-label-md text-label-md text-text-secondary mb-2">
              Vyber tému ukážky:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                className={`google-pill-btn px-4 py-2 rounded-full border font-label-md text-label-md font-medium transition-all cursor-pointer ${
                  topic === "shoes"
                    ? "border-primary bg-primary text-on-primary shadow-xs"
                    : "border-border-default bg-surface-container-low text-text-secondary hover:text-on-surface"
                }`}
                onClick={() => handleTopicChange("shoes")}
                type="button"
              >
                Bežecká obuv
              </button>
              <button
                className={`google-pill-btn px-4 py-2 rounded-full border font-label-md text-label-md font-medium transition-all cursor-pointer ${
                  topic === "coffee"
                    ? "border-primary bg-primary text-on-primary shadow-xs"
                    : "border-border-default bg-surface-container-low text-text-secondary hover:text-on-surface"
                }`}
                onClick={() => handleTopicChange("coffee")}
                type="button"
              >
                Výberová káva
              </button>
              <button
                className={`google-pill-btn px-4 py-2 rounded-full border font-label-md text-label-md font-medium transition-all cursor-pointer ${
                  topic === "seo"
                    ? "border-primary bg-primary text-on-primary shadow-xs"
                    : "border-border-default bg-surface-container-low text-text-secondary hover:text-on-surface"
                }`}
                onClick={() => handleTopicChange("seo")}
                type="button"
              >
                SEO pre e-shopy
              </button>
            </div>
          </div>

          {/* Tone selector */}
          <div>
            <label className="block font-label-md text-label-md text-text-secondary mb-2">
              Tón komunikácie (Tone of Voice):
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                className={`google-pill-btn px-3.5 py-1.5 rounded-full border font-label-md text-label-md font-medium transition-all cursor-pointer ${
                  tone === "expert"
                    ? "border-primary-container bg-primary-fixed/40 text-on-primary-fixed-variant shadow-xs"
                    : "border-border-default bg-surface-container-low text-text-secondary hover:text-on-surface"
                }`}
                onClick={() => handleToneChange("expert")}
                type="button"
              >
                Odborný
              </button>
              <button
                className={`google-pill-btn px-3.5 py-1.5 rounded-full border font-label-md text-label-md font-medium transition-all cursor-pointer ${
                  tone === "sales"
                    ? "border-primary-container bg-primary-fixed/40 text-on-primary-fixed-variant shadow-xs"
                    : "border-border-default bg-surface-container-low text-text-secondary hover:text-on-surface"
                }`}
                onClick={() => handleToneChange("sales")}
                type="button"
              >
                Predajný
              </button>
              <button
                className={`google-pill-btn px-3.5 py-1.5 rounded-full border font-label-md text-label-md font-medium transition-all cursor-pointer ${
                  tone === "seoexpert"
                    ? "border-primary-container bg-primary-fixed/40 text-on-primary-fixed-variant shadow-xs"
                    : "border-border-default bg-surface-container-low text-text-secondary hover:text-on-surface"
                }`}
                onClick={() => handleToneChange("seoexpert")}
                type="button"
              >
                SEO Expert
              </button>
            </div>
          </div>
        </div>

        {/* Generated Output Box with Stream effect */}
        <div className="relative bg-surface-container-low border border-border-default rounded-2xl p-6 min-h-[180px] flex flex-col justify-between">
          <div className="mb-4">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-google-red" />
                <span className="w-2.5 h-2.5 rounded-full bg-google-yellow" />
                <span className="w-2.5 h-2.5 rounded-full bg-google-green" />
                <span className="ml-2 font-label-sm text-label-sm text-text-secondary">
                  Meta description snippet: H1 &amp; H2 Sémantika
                </span>
              </div>
              {isStreaming && (
                <span className="text-primary font-label-sm text-label-sm flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  Streamujem tokeny...
                </span>
              )}
            </div>

            {/* Paragraph Container */}
            <p className="font-body-md text-body-md text-text-primary leading-relaxed inline">
              {displayedText}
            </p>
            {isStreaming && <span className="cursor-blink ml-1" />}
          </div>

          {/* Bottom bar: Metrics counters and Generate CTA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-border-subtle">
            <div className="flex items-center gap-4 text-text-secondary font-label-sm text-label-sm">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">subject</span>
                Počet slov: <strong className="text-text-primary font-semibold">{wordCount}</strong>
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">memory</span>
                Tokeny: <strong className="text-text-primary font-semibold">{tokenCount}</strong>
              </span>
            </div>
            <button
              className="google-pill-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary font-label-lg text-label-lg shadow-xs hover:shadow transition-all cursor-pointer"
              onClick={() => startStream()}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              <span>✨ Vygenerovať ukážku zadarmo</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
