import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  AlertTriangle,
  Clock,
  Download,
  FileSpreadsheet,
  Info,
  Printer,
  RotateCcw,
  TrendingDown,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_DATA_ROWS, MAX_FILE_BYTES, Seo03Error, assertFileSize } from "@/lib/seo03/csv";
import {
  parseCompareExport,
  parseTwoPeriodExports,
  type ParsedExport,
} from "@/lib/seo03/gsc-export";
import {
  HINT_THRESHOLDS,
  TIME_ASSUMPTION,
  buildReportCsv,
  computeLosses,
  type LossSummary,
  type PageLoss,
} from "@/lib/seo03/analysis";
import { SAMPLE_GSC_COMPARE_CSV, SAMPLE_LABEL } from "@/lib/seo03/sample";

type Source = { kind: "sample" } | { kind: "upload"; name: string };

type State =
  | { phase: "empty" }
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; source: Source; parsed: ParsedExport; summary: LossSummary };

const intFmt = new Intl.NumberFormat("sk-SK");
const dec1 = new Intl.NumberFormat("sk-SK", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const fmtInt = (n: number | null) => (n === null ? "—" : intFmt.format(Math.round(n)));
const fmtPos = (n: number | null) => (n === null || n === 0 ? "—" : dec1.format(n));
const fmtCtr = (n: number | null) => (n === null ? "—" : `${dec1.format(n * 100)} %`);
const fmtPct = (n: number | null) => (n === null ? "—" : `${dec1.format(n * 100)} %`);

function errorMessage(error: unknown): string {
  if (error instanceof Seo03Error) return error.message;
  return "Súbor sa nepodarilo spracovať. Skontroluj, či ide o CSV export zo Search Console.";
}

async function readLimited(file: File): Promise<string> {
  assertFileSize(file.size);
  return file.text();
}

export function Seo03Demo() {
  const [state, setState] = useState<State>({ phase: "empty" });
  const [dragging, setDragging] = useState(false);
  const [showTwoFiles, setShowTwoFiles] = useState(false);
  const compareInput = useRef<HTMLInputElement>(null);
  const currentInput = useRef<HTMLInputElement>(null);
  const previousInput = useRef<HTMLInputElement>(null);

  const finish = (source: Source, parsed: ParsedExport) =>
    setState({ phase: "ready", source, parsed, summary: computeLosses(parsed) });

  const run = async (task: () => Promise<{ source: Source; parsed: ParsedExport }>) => {
    setState({ phase: "loading" });
    try {
      const { source, parsed } = await task();
      finish(source, parsed);
    } catch (error) {
      setState({ phase: "error", message: errorMessage(error) });
    }
  };

  const handleCompareFile = (file: File | undefined) => {
    if (!file) return;
    void run(async () => ({
      source: { kind: "upload", name: file.name },
      parsed: parseCompareExport(await readLimited(file)),
    }));
  };

  const onCompareChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleCompareFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleCompareFile(e.dataTransfer.files?.[0]);
  };

  const analyzeTwoFiles = () => {
    const cur = currentInput.current?.files?.[0];
    const prev = previousInput.current?.files?.[0];
    if (!cur || !prev) {
      setState({
        phase: "error",
        message: "Vyber oba súbory: aktuálne aj predchádzajúce obdobie.",
      });
      return;
    }
    void run(async () => ({
      source: { kind: "upload", name: `${cur.name} + ${prev.name}` },
      parsed: parseTwoPeriodExports(await readLimited(cur), await readLimited(prev)),
    }));
  };

  const loadSample = () =>
    void run(async () => ({
      source: { kind: "sample" },
      parsed: parseCompareExport(SAMPLE_GSC_COMPARE_CSV),
    }));

  const reset = () => setState({ phase: "empty" });

  const downloadReport = () => {
    if (state.phase !== "ready") return;
    const blob = new Blob([buildReportCsv(state.summary)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seo-03-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <section className="print:hidden" aria-labelledby="seo03-upload">
        <h2 id="seo03-upload" className="sr-only">
          Nahranie exportu
        </h2>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={
            "rounded-xl border-2 border-dashed p-6 md:p-8 text-center transition-colors " +
            (dragging ? "border-primary bg-muted" : "border-border bg-card")
          }
        >
          <FileSpreadsheet className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden />
          <p className="mb-1 font-medium text-foreground">
            Nahraj CSV export „Stránky“ zo Search Console s porovnaním dvoch období
          </p>
          <p className="mb-5 text-sm text-muted-foreground">
            Výkon → Porovnať (napr. posledné 3 mesiace vs. predchádzajúce) → karta Stránky →
            Exportovať → CSV. Max. {MAX_FILE_BYTES / (1024 * 1024)} MB a{" "}
            {intFmt.format(MAX_DATA_ROWS)} riadkov.
          </p>
          <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <input
              ref={compareInput}
              id="seo03-compare-file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={onCompareChange}
            />
            <Button
              size="lg"
              className="min-h-11"
              onClick={() => compareInput.current?.click()}
              disabled={state.phase === "loading"}
            >
              <Upload /> Nahrať CSV
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="min-h-11"
              onClick={loadSample}
              disabled={state.phase === "loading"}
            >
              <FileSpreadsheet /> Načítať ukážkové dáta
            </Button>
          </div>
          <button
            type="button"
            className="mt-4 min-h-11 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            aria-expanded={showTwoFiles}
            aria-controls="seo03-two-files"
            onClick={() => setShowTwoFiles((v) => !v)}
          >
            Mám dva samostatné exporty (každý za jedno obdobie)
          </button>
          {showTwoFiles && (
            <div
              id="seo03-two-files"
              className="mx-auto mt-3 grid max-w-xl gap-3 text-left sm:grid-cols-2"
            >
              <label className="text-sm text-foreground">
                Aktuálne obdobie
                <input
                  ref={currentInput}
                  type="file"
                  accept=".csv,text/csv"
                  className="mt-1 block w-full text-sm"
                />
              </label>
              <label className="text-sm text-foreground">
                Predchádzajúce obdobie
                <input
                  ref={previousInput}
                  type="file"
                  accept=".csv,text/csv"
                  className="mt-1 block w-full text-sm"
                />
              </label>
              <Button
                variant="outline"
                className="min-h-11 sm:col-span-2"
                onClick={analyzeTwoFiles}
              >
                Porovnať dva súbory
              </Button>
            </div>
          )}
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Súbor sa spracuje iba vo vašom prehliadači. Nikam sa neodosiela, neukladá ani nezapisuje
          do logov. Po obnovení stránky zmizne.
        </p>
      </section>

      <div aria-live="polite">
        {state.phase === "empty" && <EmptyState />}
        {state.phase === "loading" && (
          <p
            role="status"
            className="rounded-xl bg-card p-6 text-center text-sm text-muted-foreground"
          >
            Načítavam a počítam straty kliknutí…
          </p>
        )}
        {state.phase === "error" && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl bg-danger-subtle p-5 ring-1 ring-danger-border"
          >
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger-foreground" aria-hidden />
            <div>
              <p className="font-medium text-danger-foreground">Súbor sa nedá použiť</p>
              <p className="mt-1 text-sm text-danger-foreground">{state.message}</p>
            </div>
          </div>
        )}
        {state.phase === "ready" && (
          <Results
            source={state.source}
            parsed={state.parsed}
            summary={state.summary}
            onReset={reset}
            onDownload={downloadReport}
          />
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl bg-card p-6 text-center ring-1 ring-border">
      <TrendingDown className="mx-auto mb-3 size-6 text-muted-foreground" aria-hidden />
      <p className="font-medium text-foreground">Zatiaľ žiadne dáta</p>
      <p className="mx-auto mt-1 max-w-[52ch] text-sm text-muted-foreground">
        Nahraj export alebo načítaj ukážkové dáta. Ukážeme tri stránky, ktoré stratili najviac
        kliknutí, a čo na nich opraviť ako prvé.
      </p>
    </div>
  );
}

function SourceBadge({ source }: { source: Source }) {
  if (source.kind === "sample") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-subtle px-3 py-1 text-xs font-semibold text-warning-foreground ring-1 ring-warning-border">
        {SAMPLE_LABEL} — vymyslený e-shop, nie reálny klient
      </span>
    );
  }
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
      Súbor: {source.name}
    </span>
  );
}

function Results({
  source,
  parsed,
  summary,
  onReset,
  onDownload,
}: {
  source: Source;
  parsed: ParsedExport;
  summary: LossSummary;
  onReset: () => void;
  onDownload: () => void;
}) {
  const skipped = parsed.skippedInvalid + parsed.skippedDuplicate;
  const saved = TIME_ASSUMPTION.manualMinutes - TIME_ASSUMPTION.demoMinutes;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <SourceBadge source={source} />
        <span className="text-xs text-muted-foreground">
          {intFmt.format(summary.pagesTotal)} stránok · {intFmt.format(summary.pagesWithLoss)} so
          stratou · spolu −{intFmt.format(summary.totalClickLoss)} kliknutí
        </span>
        {skipped > 0 && (
          <span className="text-xs text-warning-foreground">
            Preskočené riadky: {skipped} (chýba stránka alebo číslo, prípadne duplicita)
          </span>
        )}
      </div>

      {summary.top.length === 0 ? (
        <div className="rounded-xl bg-success-subtle p-6 ring-1 ring-success-border print:hidden">
          <p className="font-medium text-success-foreground">Žiadna stránka nestratila kliknutia</p>
          <p className="mt-1 text-sm text-success-foreground">
            V porovnaní období ({parsed.periodLabels.current} vs. {parsed.periodLabels.previous})
            nemá žiadna stránka menej kliknutí. Niet čo opravovať.
          </p>
        </div>
      ) : (
        <section aria-labelledby="seo03-top" className="print:hidden">
          <h2 id="seo03-top" className="mb-1 font-display text-2xl text-foreground">
            Top {summary.top.length} {summary.top.length === 1 ? "stránka" : "stránky"} so stratou
            kliknutí
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {parsed.periodLabels.current} vs. {parsed.periodLabels.previous}
          </p>
          {summary.top.length < 3 && (
            <p className="mb-4 text-sm text-muted-foreground">
              Kliknutia stratilo iba {summary.top.length}{" "}
              {summary.top.length === 1 ? "stránka" : "stránky"}, preto ich je menej ako tri.
            </p>
          )}
          <ol className="grid gap-4 lg:grid-cols-3">
            {summary.top.map((p) => (
              <LossCard key={p.page} page={p} />
            ))}
          </ol>
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <strong className="font-semibold">Predpoklad, nie meranie:</strong> ručný report v
              Search Console trvá približne {TIME_ASSUMPTION.manualMinutes} min, tu približne{" "}
              {TIME_ASSUMPTION.demoMinutes} min. Odhad úspory ≈ {saved} min na klienta.
            </span>
          </p>
        </section>
      )}

      {summary.top.length > 0 && (
        <ClientReport source={source} parsed={parsed} summary={summary} onDownload={onDownload} />
      )}

      <div className="print:hidden">
        <Button variant="ghost" className="min-h-11" onClick={onReset}>
          <RotateCcw /> Začať znova
        </Button>
      </div>
    </div>
  );
}

function Delta({ label, prev, cur }: { label: string; prev: string; cur: string }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right tabular-nums text-foreground">
        {prev} → {cur}
      </dd>
    </div>
  );
}

function LossCard({ page }: { page: PageLoss }) {
  const [first, ...rest] = page.hints;
  return (
    <li className="flex flex-col rounded-xl bg-card p-5 ring-1 ring-border">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold text-muted-foreground">#{page.rank}</span>
        <span className="text-right">
          <span className="block font-display text-2xl tabular-nums text-danger-foreground">
            −{fmtInt(page.clickLoss)}
          </span>
          <span className="text-xs text-muted-foreground">
            kliknutí ({page.lossPct === null ? "—" : `−${fmtPct(page.lossPct)}`})
          </span>
        </span>
      </div>
      <p className="mb-3 break-all text-sm font-medium text-foreground">{page.page}</p>
      <dl className="mb-4 space-y-1">
        <Delta
          label="Kliknutia"
          prev={fmtInt(page.previous.clicks)}
          cur={fmtInt(page.current.clicks)}
        />
        <Delta
          label="Zobrazenia"
          prev={fmtInt(page.previous.impressions)}
          cur={fmtInt(page.current.impressions)}
        />
        <Delta label="CTR" prev={fmtCtr(page.previous.ctr)} cur={fmtCtr(page.current.ctr)} />
        <Delta
          label="Pozícia"
          prev={fmtPos(page.previous.position)}
          cur={fmtPos(page.current.position)}
        />
      </dl>
      <div className="mt-auto rounded-lg bg-muted p-3">
        <p className="text-xs font-semibold text-muted-foreground">Čo opraviť ako prvé</p>
        <p className="mt-1 text-sm font-medium text-foreground">{first.title}</p>
        <p className="mt-1 text-sm text-secondary-foreground">{first.detail}</p>
        {rest.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Ďalej: {rest.map((h) => h.title).join(", ")}
          </p>
        )}
      </div>
    </li>
  );
}

function ClientReport({
  source,
  parsed,
  summary,
  onDownload,
}: {
  source: Source;
  parsed: ParsedExport;
  summary: LossSummary;
  onDownload: () => void;
}) {
  return (
    <section
      aria-labelledby="seo03-report"
      className="rounded-xl bg-card p-5 ring-1 ring-border md:p-8 print:p-0 print:ring-0"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="seo03-report" className="font-display text-2xl text-foreground">
            Klientsky report
          </h2>
          <p className="text-sm text-muted-foreground">
            Pokles kliknutí zo Search Console · {parsed.periodLabels.current} vs.{" "}
            {parsed.periodLabels.previous}
          </p>
          {source.kind === "sample" && (
            <p className="mt-1 text-sm font-semibold text-warning-foreground">
              {SAMPLE_LABEL} — vymyslený e-shop, nie reálny klient.
            </p>
          )}
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" className="min-h-11" onClick={() => window.print()}>
            <Printer /> Tlačiť / PDF
          </Button>
          <Button className="min-h-11" onClick={onDownload}>
            <Download /> Stiahnuť CSV
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Top stránky so stratou kliknutí</caption>
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" className="py-2 pr-3">
                #
              </th>
              <th scope="col" className="py-2 pr-3">
                Stránka
              </th>
              <th scope="col" className="py-2 pr-3 text-right">
                Kliknutia
              </th>
              <th scope="col" className="py-2 pr-3 text-right">
                Strata
              </th>
              <th scope="col" className="py-2 pr-3 text-right">
                CTR
              </th>
              <th scope="col" className="py-2 pr-3 text-right">
                Pozícia
              </th>
              <th scope="col" className="py-2">
                Čo opraviť ako prvé
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.top.map((p) => (
              <tr key={p.page} className="border-b border-border align-top">
                <td className="py-3 pr-3 tabular-nums">{p.rank}</td>
                <td className="max-w-[220px] break-all py-3 pr-3">{p.page}</td>
                <td className="py-3 pr-3 text-right tabular-nums whitespace-nowrap">
                  {fmtInt(p.previous.clicks)} → {fmtInt(p.current.clicks)}
                </td>
                <td className="py-3 pr-3 text-right tabular-nums whitespace-nowrap">
                  −{fmtInt(p.clickLoss)}
                  <span className="block text-xs text-muted-foreground">
                    {p.lossPct === null ? "—" : `−${fmtPct(p.lossPct)}`}
                  </span>
                </td>
                <td className="py-3 pr-3 text-right tabular-nums whitespace-nowrap">
                  {fmtCtr(p.previous.ctr)} → {fmtCtr(p.current.ctr)}
                </td>
                <td className="py-3 pr-3 text-right tabular-nums whitespace-nowrap">
                  {fmtPos(p.previous.position)} → {fmtPos(p.current.position)}
                </td>
                <td className="py-3">
                  <span className="font-medium">{p.hints[0].title}.</span> {p.hints[0].detail}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Pravidlá odporúčaní: pokles pozície o ≥ {HINT_THRESHOLDS.positionDrop} → obsah a odkazy;
        pokles CTR o ≥ {HINT_THRESHOLDS.ctrRelativeDrop * 100} % pri stabilnej pozícii → title a
        meta; pokles zobrazení o ≥ {HINT_THRESHOLDS.impressionsDrop * 100} % pri stabilnej pozícii →
        dopyt alebo indexácia.
      </p>
    </section>
  );
}
