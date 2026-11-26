import * as React from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

export interface KpiSlideItem {
  id: string;
  title: string;
  value: string;
  badge: {
    text: string;
    isPositive: boolean;
  };
  subtitle?: string;
  reportHref?: string;
}

interface TactileKpiSliderProps {
  slides: KpiSlideItem[];
}

/**
 * TactileKpiSlider
 *
 * Studio-grade, swipable claymorphic KPI card carousel with pagination dots.
 * Features:
 * - Fluid horizontal snap-sliding (CSS scroll-snap + touch/drag gesture).
 * - 3 interactive tactile pagination dots (guličky) with spring indicator.
 * - Previous/Next slide arrow controls.
 * - 1:1 match with the generated industrial titanium mockup.
 */
export function TactileKpiSlider({ slides }: TactileKpiSliderProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const total = slides.length;

  const scrollToSlide = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const bounded = Math.max(0, Math.min(idx, total - 1));
    const slideWidth = el.offsetWidth;
    el.scrollTo({
      left: bounded * slideWidth,
      behavior: "smooth",
    });
    setActiveIndex(bounded);
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || el.offsetWidth === 0) return;
    const newIdx = Math.round(el.scrollLeft / el.offsetWidth);
    if (newIdx !== activeIndex && newIdx >= 0 && newIdx < total) {
      setActiveIndex(newIdx);
    }
  };

  if (!slides || slides.length === 0) return null;

  return (
    <div className="relative w-full select-none py-2">
      {/* Slider viewport */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex w-full overflow-x-auto scrollbar-none snap-x snap-mandatory gap-4 pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {slides.map((s, i) => (
          <div
            key={s.id}
            className="w-full shrink-0 snap-center rounded-2xl border border-white/10 bg-[#171717] p-5 sm:p-6 shadow-2xl relative overflow-hidden ring-1 ring-white/5 transition-all duration-300"
            style={{
              boxShadow:
                "0 20px 35px -8px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.18), inset 0 -2px 4px rgba(0,0,0,0.5)",
            }}
          >
            {/* Top specular reflection sheen */}
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

            {/* Header info */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                {s.title}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  s.badge.isPositive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                    : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                }`}
              >
                {s.badge.isPositive ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {s.badge.text}
              </span>
            </div>

            {/* Big KPI Metric Value */}
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-none">
                {s.value}
              </span>
              {s.subtitle && (
                <span className="text-xs font-medium text-zinc-400">{s.subtitle}</span>
              )}
            </div>

            {/* Bottom action link */}
            <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3 text-xs">
              <span className="text-zinc-400">Pomer voči predchádzajúcim 90 dňom</span>
              {s.reportHref ? (
                <a
                  href={s.reportHref}
                  className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:text-emerald-300 transition-colors group"
                >
                  Detailný report{" "}
                  <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                  Aktívne dáta
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Controls: Prev/Next & 3 Pagination Dots */}
      <div className="mt-3 flex items-center justify-between px-2">
        {/* Left Arrow */}
        <button
          type="button"
          onClick={() => scrollToSlide(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="Predchádzajúca metrika"
          className="flex size-7 items-center justify-center rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
        >
          <ChevronLeft className="size-4" />
        </button>

        {/* 3 Pagination Dots (guličky) */}
        <div className="flex items-center gap-2">
          {slides.map((_, dotIdx) => (
            <button
              key={dotIdx}
              type="button"
              onClick={() => scrollToSlide(dotIdx)}
              aria-label={`Prejsť na slide ${dotIdx + 1}`}
              className={`transition-all duration-300 rounded-full ${
                dotIdx === activeIndex
                  ? "w-6 h-2 bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
                  : "size-2 bg-zinc-600 hover:bg-zinc-400"
              }`}
            />
          ))}
        </div>

        {/* Right Arrow */}
        <button
          type="button"
          onClick={() => scrollToSlide(activeIndex + 1)}
          disabled={activeIndex === total - 1}
          aria-label="Nasledujúca metrika"
          className="flex size-7 items-center justify-center rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
