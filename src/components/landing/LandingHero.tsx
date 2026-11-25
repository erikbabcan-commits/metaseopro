import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { parseDomainInput } from "@/lib/domain-input";
import { startAuditEntry } from "@/lib/audit-entry";
import { toast } from "sonner";

interface LandingHeroProps {
  onAnalyze?: (domain: string) => void;
}

export function LandingHero({ onAnalyze }: LandingHeroProps) {
  const navigate = useNavigate();
  const [domain, setDomain] = useState("");
  const [placeholder, setPlaceholder] = useState("www.mojeshop.sk");
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlTarget, setCrawlTarget] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Typewriter effect
  useEffect(() => {
    const sampleQueries = ["www.mojeshop.sk", "www.fitness-eshop.cz", "www.kaviaren.sk"];
    let queryIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timer: NodeJS.Timeout;

    function tick() {
      // Don't update if input has user focus or value
      if (document.activeElement === inputRef.current || domain.length > 0) {
        timer = setTimeout(tick, 500);
        return;
      }

      const currentWord = sampleQueries[queryIndex];
      if (isDeleting) {
        setPlaceholder(currentWord.substring(0, charIndex - 1));
        charIndex--;
      } else {
        setPlaceholder(currentWord.substring(0, charIndex + 1));
        charIndex++;
      }

      let speed = isDeleting ? 40 : 80;

      if (!isDeleting && charIndex === currentWord.length) {
        speed = 2200; // Pause at end of word
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        queryIndex = (queryIndex + 1) % sampleQueries.length;
        speed = 500;
      }

      timer = setTimeout(tick, speed);
    }

    timer = setTimeout(tick, 800);
    return () => clearTimeout(timer);
  }, [domain]);

  const handleAuditTrigger = (targetDomain?: string) => {
    const rawVal = targetDomain || domain.trim() || placeholder || "www.mojeshop.sk";
    const cleaned = rawVal
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .trim();

    if (!cleaned) {
      toast.error("Zadaj platnú doménu alebo URL.");
      return;
    }

    setCrawlTarget(cleaned);
    setIsCrawling(true);

    if (onAnalyze) {
      onAnalyze(cleaned);
    }

    // Launch audit & navigate after brief crawling visual feedback
    setTimeout(() => {
      setIsCrawling(false);
      try {
        const parsed = parseDomainInput(cleaned);
        startAuditEntry(parsed, "audit");
      } catch {
        // Fallback navigation
      }
      void navigate({ to: "/audit", search: { domain: cleaned } as Record<string, string> });
    }, 2400);
  };

  const handleSelectChip = (chipDomain: string) => {
    setDomain(chipDomain);
    if (inputRef.current) {
      inputRef.current.value = chipDomain;
      inputRef.current.focus();
    }
    handleAuditTrigger(chipDomain);
  };

  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
      {/* Subtle background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[360px] bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Live status laser pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-lowest border border-border-default shadow-xs mb-8">
          <span className="pulse-laser inline-block w-2.5 h-2.5 rounded-full bg-google-green" />
          <span className="font-label-md text-label-md text-text-secondary">
            Live Crawler v3.8 aktívny
          </span>
          <span className="text-outline-variant">•</span>
          <span className="font-label-md text-label-md text-secondary font-medium">
            99.8% Google Core Web Vitals kompatibilita
          </span>
        </div>

        {/* PageHeading */}
        <h1 className="font-display-mobile md:font-display text-display-mobile md:text-display text-on-surface tracking-tight mb-4 font-semibold">
          Autentická SEO analýza &amp; AI Writer
        </h1>
        <p className="font-body-lg text-body-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          Okamžitá analýza technického SEO s live crawler indikátorom a generátorom obsahu pre
          Google.
        </p>

        {/* Hero Search Bar */}
        <div className="max-w-2xl mx-auto relative mb-4">
          <form
            className="hero-search-shadow w-full flex items-center bg-surface-pure rounded-full border border-border-default px-4 py-2 sm:py-2.5 transition-all"
            onSubmit={(e) => {
              e.preventDefault();
              handleAuditTrigger();
            }}
          >
            <span className="material-symbols-outlined text-text-secondary text-[24px] ml-2 mr-3 select-none">
              search
            </span>
            <div className="relative flex-grow text-left">
              <input
                ref={inputRef}
                autoComplete="off"
                className="w-full bg-transparent border-0 p-0 text-text-primary font-body-md text-body-md focus:ring-0 focus:outline-none placeholder:text-outline-variant"
                placeholder={placeholder}
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onFocus={() => {}}
              />
            </div>
            <button
              className="google-pill-btn ml-2 bg-primary-container text-on-primary-container px-4 sm:px-6 py-2 rounded-full font-label-lg text-label-lg flex items-center gap-1.5 shadow-xs hover:bg-primary transition-all cursor-pointer"
              type="submit"
            >
              <span className="material-symbols-outlined text-[18px]">travel_explore</span>
              <span className="hidden sm:inline">Analyzovať</span>
            </button>
          </form>

          {/* Live crawling feedback state */}
          {isCrawling && (
            <div className="absolute top-full left-0 right-0 mt-3 p-3 bg-surface-pure border border-border-default rounded-xl shadow-md flex items-center justify-between text-left animate-in fade-in duration-200 z-20">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <div>
                  <p className="font-label-lg text-label-lg text-on-surface font-semibold">
                    Prebieha hĺbkový audit pre doménu: {crawlTarget}
                  </p>
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    Simulujeme Googlebot Smartphone &amp; Desktop crawl...
                  </p>
                </div>
              </div>
              <span className="font-label-sm text-label-sm px-2.5 py-1 bg-secondary-container text-on-secondary-container rounded-full font-semibold">
                200 OK
              </span>
            </div>
          )}
        </div>

        {/* Chips */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-8">
          <span className="font-label-sm text-label-sm text-text-secondary mr-1">
            Rýchle ukážky:
          </span>
          <button
            className="chip-item google-pill-btn inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-border-subtle hover:border-outline text-text-secondary font-label-md text-label-md cursor-pointer"
            onClick={() => handleSelectChip("www.mojeshop.sk")}
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">search</span>
            <span>www.mojeshop.sk</span>
          </button>
          <button
            className="chip-item google-pill-btn inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-border-subtle hover:border-outline text-text-secondary font-label-md text-label-md cursor-pointer"
            onClick={() => handleSelectChip("www.fitness-eshop.cz")}
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">search</span>
            <span>www.fitness-eshop.cz</span>
          </button>
          <button
            className="chip-item google-pill-btn inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-border-subtle hover:border-outline text-text-secondary font-label-md text-label-md cursor-pointer"
            onClick={() => handleSelectChip("www.kaviaren.sk")}
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">search</span>
            <span>www.kaviaren.sk</span>
          </button>
        </div>

        {/* Single CTA Button */}
        <div className="flex justify-center">
          <button
            className="google-pill-btn inline-flex items-center justify-center gap-2 h-[52px] px-8 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
            onClick={() => handleAuditTrigger()}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] text-google-yellow">
              arrow_back_ios_new
            </span>
            <span>✨ Okamžitá analýza technického SEO</span>
          </button>
        </div>
      </div>
    </section>
  );
}
