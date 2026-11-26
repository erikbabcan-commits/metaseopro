import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LEGAL_PATHS } from "@/lib/legal";

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background text-on-surface antialiased font-sans">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-primary hover:underline font-label-lg text-label-lg mb-8"
        >
          ← Späť na úvodnú stránku
        </Link>
        <h1 className="font-headline-lg text-headline-lg font-bold text-text-primary mb-6">
          {title}
        </h1>
        <article className="space-y-4 font-body-md text-body-md text-text-secondary leading-relaxed">
          {children}
        </article>
        <nav
          aria-label="Právne dokumenty"
          className="mt-12 pt-6 border-t border-border-subtle flex flex-wrap gap-x-6 gap-y-2 font-label-md text-label-md"
        >
          <Link to={LEGAL_PATHS.terms} className="text-primary hover:underline">
            Obchodné podmienky
          </Link>
          <Link to={LEGAL_PATHS.privacy} className="text-primary hover:underline">
            Ochrana osobných údajov
          </Link>
          <Link to={LEGAL_PATHS.cookies} className="text-primary hover:underline">
            Cookies
          </Link>
          <Link to="/" className="text-primary hover:underline">
            Späť na úvod
          </Link>
        </nav>
      </main>
    </div>
  );
}
