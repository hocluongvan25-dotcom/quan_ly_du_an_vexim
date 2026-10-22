"use client";

import { FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { homeCopy, type Lang, type LookupStatus } from "@/lib/site/content";
import { MIN_QUERY_LENGTH } from "@/lib/site/lookup";
import { cn } from "@/lib/utils";

type Standard = "FDA" | "GACC";

export type LookupRecord = {
  id: number;
  companyName: string;
  standard: Standard;
  registrationNumber: string;
  status: LookupStatus;
  expiresAt: string;
  updatedAt: string;
};

type Phase = "idle" | "loading" | "done" | "error";

export function LookupPanel({
  lang,
  defaultStandard = "FDA",
  showHeading = false,
  initialQuery = "",
  syncUrl = false,
  className,
  heading,
  description,
}: {
  lang: Lang;
  defaultStandard?: Standard;
  showHeading?: boolean;
  initialQuery?: string;
  syncUrl?: boolean;
  className?: string;
  heading?: string;
  description?: string;
}) {
  const copy = homeCopy(lang).lookup;
  const inputId = useId();

  const [standard, setStandard] = useState<Standard>(defaultStandard);
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<LookupRecord[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const startedRef = useRef(false);

  const search = useCallback(
    async (rawQuery: string, type: Standard) => {
      const trimmed = rawQuery.trim();
      if (trimmed.length < MIN_QUERY_LENGTH) {
        setPhase("error");
        setMessage(copy.shortQuery);
        setItems([]);
        return;
      }

      setPhase("loading");
      setMessage("");

      try {
        const response = await fetch(
          `/api/public/lookup?q=${encodeURIComponent(trimmed)}&type=${type}`,
          { headers: { Accept: "application/json" }, cache: "no-store" }
        );
        const payload = (await response.json()) as { items?: LookupRecord[]; error?: string };

        if (!response.ok) {
          setPhase("error");
          setMessage(payload.error === "QUERY_TOO_SHORT" ? copy.shortQuery : copy.networkError);
          setItems([]);
          return;
        }

        setItems(payload.items || []);
        setPhase("done");

        if (syncUrl && typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.set("q", trimmed);
          url.searchParams.set("type", type);
          window.history.replaceState(null, "", url.toString());
        }
      } catch {
        setPhase("error");
        setMessage(copy.networkError);
        setItems([]);
      }
    },
    [copy.networkError, copy.shortQuery, syncUrl]
  );

  useEffect(() => {
    if (startedRef.current) return;
    if (initialQuery.trim().length >= MIN_QUERY_LENGTH) {
      startedRef.current = true;
      void search(initialQuery, defaultStandard);
    }
  }, [defaultStandard, initialQuery, search]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search(query, standard);
  }

  return (
    <div
      className={cn("border border-line bg-white", showHeading ? "p-5 md:p-8" : "p-5 shadow-panel md:p-7", className)}
    >
      {showHeading ? (
        <>
          <h2 className="font-serif text-[24px] leading-snug text-brand-950 md:text-[28px]">
            {heading || copy.heading}
          </h2>
          <p className="mt-3 max-w-2xl text-[13px] leading-6 text-ink-500">{description || copy.description}</p>
        </>
      ) : null}

      <form onSubmit={onSubmit} className={showHeading ? "mt-6" : ""} noValidate>
        <fieldset className="m-0 border-0 p-0">
          <legend className="text-[10px] font-semibold uppercase tracking-label text-ink-400">
            {copy.typeGroupLabel}
          </legend>
          <div
            role="radiogroup"
            aria-label={copy.typeGroupLabel}
            className="mt-2 grid grid-cols-2 gap-1 border border-line bg-paper-deep/70 p-1"
          >
            {(["FDA", "GACC"] as const).map((option) => {
              const selected = standard === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setStandard(option);
                    if (phase === "done" || phase === "error") {
                      void search(query, option);
                    }
                  }}
                  className={cn(
                    "focus-ring px-3 py-2.5 text-[12.5px] transition-colors",
                    selected
                      ? "bg-white font-semibold text-brand-900 shadow-[0_1px_0_rgba(16,41,68,0.08)]"
                      : "text-ink-500 hover:text-brand-900"
                  )}
                >
                  {option === "FDA" ? copy.fda : copy.gacc}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-5">
          <label htmlFor={inputId} className="block text-[10px] font-semibold uppercase tracking-label text-ink-400">
            {copy.inputLabel}
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id={inputId}
              name="q"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.placeholder}
              autoComplete="off"
              maxLength={120}
              className="focus-ring h-12 w-full min-w-0 flex-1 border border-line-strong bg-white px-3.5 text-[14px] text-ink placeholder:text-ink-300"
            />
            <button
              type="submit"
              disabled={phase === "loading"}
              className="focus-ring h-12 shrink-0 border border-brand-900 bg-brand-900 px-7 text-[13px] font-semibold text-white transition-colors hover:border-brand-800 hover:bg-brand-800 disabled:cursor-wait disabled:opacity-70"
            >
              {phase === "loading" ? copy.submitting : copy.submit}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-line pt-3 text-[11px] leading-5 text-ink-400">
          <span className="font-medium text-ink-500">{copy.qrLabel}:</span>
          <span>{copy.qrNote}</span>
        </div>
      </form>

      <div aria-live="polite" aria-atomic="false">
        {phase === "error" && message ? (
          <p className="mt-6 border-t border-line pt-5 text-[12.5px] leading-6 text-fail">{message}</p>
        ) : null}

        {phase === "done" && items.length === 0 ? (
          <p className="mt-6 border-t border-line pt-5 text-[12.5px] leading-6 text-ink-600">{copy.notFound}</p>
        ) : null}

        {phase === "done" && items.length > 0 ? (
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-label text-ink-400">
              {copy.resultsHeading(items.length)}
            </p>
            <ul className="mt-3 space-y-3">
              {items.map((item) => (
                <LookupRecordCard key={item.id} item={item} lang={lang} />
              ))}
            </ul>
            <p className="mt-4 text-[11px] leading-5 text-ink-400">{copy.hint}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LookupRecordCard({ item, lang }: { item: LookupRecord; lang: Lang }) {
  const copy = homeCopy(lang).lookup;
  const rows: Array<{ label: string; value: React.ReactNode; emphasis?: boolean }> = [
    { label: copy.resultLabels.company, value: item.companyName, emphasis: true },
    { label: copy.resultLabels.type, value: copy.typeLabels[item.standard] },
    { label: copy.resultLabels.number, value: item.registrationNumber },
    {
      label: copy.resultLabels.status,
      value: <StatusBadge status={item.status} label={copy.statusLabels[item.status]} />,
    },
    { label: copy.resultLabels.expiry, value: item.expiresAt },
    { label: copy.resultLabels.manager, value: copy.managerName },
    { label: copy.resultLabels.updated, value: item.updatedAt },
  ];

  return (
    <li className="border border-line bg-paper/60">
      <dl>
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-2.5 last:border-b-0"
          >
            <dt className="shrink-0 text-[11px] text-ink-400">{row.label}</dt>
            <dd
              className={cn(
                "ml-auto text-right text-[12.5px] leading-5",
                row.emphasis ? "font-semibold text-brand-950" : "text-ink-800"
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

export function StatusBadge({ status, label }: { status: LookupStatus; label: string }) {
  const tone: Record<LookupStatus, string> = {
    valid: "border-okay/35 bg-okay/5 text-okay",
    expiring: "border-warn/35 bg-warn/5 text-warn",
    expired: "border-fail/35 bg-fail/5 text-fail",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
        tone[status]
      )}
    >
      {label}
    </span>
  );
}
