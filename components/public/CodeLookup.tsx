"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { siteCopy, type SiteLang } from "@/lib/public-content";
import { formatLookupDate, type PublicLookupItem } from "@/lib/public-lookup";
import { QrScanner } from "./QrScanner";

type LookupType = "FDA" | "GACC";

type LookupState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; items: PublicLookupItem[] }
  | { kind: "error"; message: string };

const STATUS_CLASS: Record<PublicLookupItem["status"], string> = {
  valid: "chip chip--valid",
  expiring: "chip chip--expiring",
  expired: "chip chip--expired",
};

export function CodeLookup({ lang }: { lang: SiteLang }) {
  const c = siteCopy(lang);
  const copy = c.lookup;
  const [type, setType] = useState<LookupType>("FDA");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<LookupState>({ kind: "idle" });
  const [scanOpen, setScanOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputId = useId();

  const statusLabel: Record<PublicLookupItem["status"], string> = {
    valid: copy.statusValid,
    expiring: copy.statusExpiring,
    expired: copy.statusExpired,
  };

  function reset() {
    abortRef.current?.abort();
    setState({ kind: "idle" });
  }

  function changeType(next: LookupType) {
    if (next === type) return;
    setType(next);
    reset();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (value.length < 2) {
      setState({ kind: "error", message: copy.tooShort });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ kind: "loading" });

    try {
      const response = await fetch(
        `/api/public/lookup?type=${type}&q=${encodeURIComponent(value)}`,
        { signal: controller.signal, cache: "no-store" },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setState({
        kind: "done",
        items: Array.isArray(data.items) ? (data.items as PublicLookupItem[]) : [],
      });
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      setState({ kind: "error", message: copy.failed });
    }
  }

  return (
    <section className="lookup" id="tra-cuu" aria-labelledby="lookup-title">
      <div className="lookup__head">
        <span className="lookup__index" aria-hidden="true">
          {copy.index}
        </span>
        <span className="lookup__kicker">{copy.kicker}</span>
      </div>
      <h2 className="lookup__title" id="lookup-title">
        {copy.title}
      </h2>

      <form className="lookup__body" onSubmit={onSubmit} noValidate>
        <div>
          <span className="lookup__label" id="lookup-type-label">
            {copy.typeLabel}
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby="lookup-type-label">
            {(["FDA", "GACC"] as LookupType[]).map((option) => (
              <label
                key={option}
                className={`segmented__opt${type === option ? " is-active" : ""}`}
              >
                <input
                  type="radio"
                  name="lookup-type"
                  value={option}
                  checked={type === option}
                  onChange={() => changeType(option)}
                />
                <span>{option === "FDA" ? copy.fda : copy.gacc}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="lookup__label" htmlFor={inputId}>
            {copy.inputLabel}
          </label>
          <input
            id={inputId}
            className="lookup__input"
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.placeholder}
            autoComplete="off"
            enterKeyHint="search"
            maxLength={120}
          />
        </div>

        <div className="lookup__actions">
          <button
            type="submit"
            className="site-btn site-btn--primary"
            disabled={state.kind === "loading"}
            aria-busy={state.kind === "loading"}
          >
            {state.kind === "loading" ? copy.submitting : copy.submit}
          </button>
          <button
            type="button"
            className="site-btn site-btn--outline"
            onClick={() => setScanOpen(true)}
          >
            {copy.scan}
          </button>
        </div>

        <p className="lookup__note">{copy.note}</p>
      </form>

      <div className="lookup__results" aria-live="polite">
        {state.kind === "error" && (
          <p className="notice notice--error" role="alert">
            {state.message}
          </p>
        )}

        {state.kind === "done" && state.items.length === 0 && (
          <div className="notice">
            {copy.notFound.before}
            <a href={c.org.phoneHref}>{copy.notFound.phone}</a>
            {copy.notFound.after}
          </div>
        )}

        {state.kind === "done" && state.items.length > 0 && (
          <>
            <div className="results__head">
              <span>{copy.resultsLabel}</span>
              <span className="results__count">
                {state.items.length === 1
                  ? copy.countOne
                  : copy.countMany.replace("{count}", String(state.items.length))}
              </span>
            </div>

            {state.items.map((item) => (
              <article className="result" key={item.public_code}>
                <dl>
                  <div className="result__row">
                    <dt>{copy.resultCompany}</dt>
                    <dd>{item.company_name}</dd>
                  </div>
                  <div className="result__row">
                    <dt>{copy.resultType}</dt>
                    <dd>{item.standard}</dd>
                  </div>
                  <div className="result__row">
                    <dt>{copy.resultStatus}</dt>
                    <dd>
                      <span className={STATUS_CLASS[item.status]}>{statusLabel[item.status]}</span>
                    </dd>
                  </div>
                  <div className="result__row">
                    <dt>{copy.resultDeadline}</dt>
                    <dd>{formatLookupDate(item.expires_at)}</dd>
                  </div>
                </dl>
                <div className="result__foot">
                  <a
                    className="result__link"
                    href={`/verify/${encodeURIComponent(item.public_code)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {copy.openVerify}
                  </a>
                </div>
              </article>
            ))}

            <button type="button" className="results__reset" onClick={() => setState({ kind: "idle" })}>
              {copy.startOver}
            </button>
          </>
        )}
      </div>

      {scanOpen && <QrScanner lang={lang} onClose={() => setScanOpen(false)} />}
    </section>
  );
}
