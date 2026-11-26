import { useState } from "react";
import { faqData } from "./faq-data";

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-24" id="faq">
      <div className="text-center mb-12">
        <span className="font-label-md text-label-md uppercase tracking-wider text-primary font-bold">
          Podpora &amp; Odpovede
        </span>
        <h2 className="font-headline-lg text-headline-lg text-text-primary mt-1 font-semibold">
          Často kladené otázky (FAQ)
        </h2>
      </div>

      <div className="space-y-3">
        {faqData.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="faq-item bg-surface-pure border border-border-default rounded-2xl overflow-hidden transition-all duration-200"
            >
              <button
                className="w-full flex items-center justify-between p-5 sm:p-6 text-left focus:outline-none cursor-pointer"
                onClick={() => toggle(idx)}
                type="button"
              >
                <span className="font-title-lg text-title-lg font-semibold text-text-primary">
                  {item.question}
                </span>
                <span
                  className={`material-symbols-outlined text-text-secondary transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  expand_more
                </span>
              </button>
              {isOpen && (
                <div className="px-5 sm:px-6 animate-in fade-in duration-200">
                  <p className="font-body-md text-body-md text-text-secondary pb-6">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
