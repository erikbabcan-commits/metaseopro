import { Link } from "@tanstack/react-router";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 bg-surface-pure/95 backdrop-blur-md shadow-xs transition-all border-b border-border-subtle/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Anchor */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container shadow-xs group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[18px]">search_insights</span>
            </div>
            <span className="font-headline-sm text-headline-sm text-text-primary tracking-tight font-extrabold flex items-center">
              Seo<span className="text-primary-container">4</span>web
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <a
              className="px-3.5 py-1.5 rounded-full font-label-lg text-label-lg text-text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
              href="#nastroje"
            >
              Nástroje
            </a>
            <a
              className="px-3.5 py-1.5 rounded-full font-label-lg text-label-lg text-text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
              href="#ai-writer"
            >
              AI Writer
            </a>
            <a
              className="px-3.5 py-1.5 rounded-full font-label-lg text-label-lg text-text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
              href="#cennik"
            >
              Cenník
            </a>
            <a
              className="px-3.5 py-1.5 rounded-full font-label-lg text-label-lg text-text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
              href="#faq"
            >
              FAQ
            </a>
            <a
              className="px-3.5 py-1.5 rounded-full font-label-lg text-label-lg text-text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
              href="#pripadove-studie"
            >
              Prípadové štúdie
            </a>
          </nav>
        </div>

        {/* Trailing Actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="google-pill-btn hidden sm:inline-flex px-4 py-2 rounded-full font-label-lg text-label-lg text-primary hover:bg-primary-fixed/40 transition-colors"
          >
            Prihlásenie
          </Link>
          <Link
            to="/login"
            className="google-pill-btn px-5 py-2 rounded-full bg-primary text-on-primary font-label-lg text-label-lg shadow-xs hover:shadow hover:bg-primary-container transition-all flex items-center gap-1.5"
          >
            <span>Začať zadarmo</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
