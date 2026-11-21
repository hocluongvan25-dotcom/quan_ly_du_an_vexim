import { siteCopy, type SiteLang } from "@/lib/public-content";
import { CodeLookup } from "./CodeLookup";
import { SiteFaq, SiteServices } from "./SiteSections";

type HomeBodyProps = { lang: SiteLang };

export function HomeBody({ lang }: HomeBodyProps) {
  const c = siteCopy(lang);

  return (
    <>
      <section className="public-hero" aria-labelledby="home-title">
        <div className="public-shell public-hero__inner">
          <div className="public-hero__copy">
            <p className="public-eyebrow">{c.hero.eyebrow}</p>
            <h1 id="home-title">{c.hero.title}</h1>
            <p className="public-hero__lead">{c.hero.lead}</p>
            <div className="public-hero__actions">
              <a className="public-button public-button--primary" href="#tra-cuu">
                {c.hero.primary}
              </a>
              <a className="public-button public-button--quiet" href={c.org.phoneHref}>
                {c.hero.secondary}
              </a>
            </div>
          </div>

          <div className="public-hero__visual" role="group" aria-label={c.hero.highlightsLabel}>
            <div className="public-hero__visual-top">
              <span className="public-status-dot" aria-hidden="true" />
              <span>{c.lookup.kicker}</span>
              <span className="public-hero__visual-mark" aria-hidden="true">V.</span>
            </div>
            <div className="public-hero__visual-content">
              <p className="public-hero__visual-label">{c.hero.highlightsLabel}</p>
              <div className="public-hero__code" aria-hidden="true">
                <span>FDA</span>
                <i />
                <i />
                <i />
                <i />
                <b />
              </div>
              <ul className="public-hero__highlights">
                {c.hero.highlights.map((highlight, index) => (
                  <li key={highlight}>
                    <span aria-hidden="true">0{index + 1}</span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </div>
            <a className="public-hero__visual-link" href="#tra-cuu">
              {c.hero.primary}
            </a>
          </div>
        </div>
      </section>

      <section className="public-section public-lookup-section" aria-labelledby="lookup-title">
        <div className="public-shell">
          <div className="public-section__heading public-section__heading--center">
            <p className="public-eyebrow">{c.lookup.kicker}</p>
            <h2 id="lookup-title">{c.lookup.title}</h2>
          </div>
          <CodeLookup lang={lang} />
        </div>
      </section>

      <section id="dich-vu" className="public-section public-services-section" aria-labelledby="services-title">
        <div className="public-shell">
          <div className="public-section__heading public-section__heading--split">
            <div>
              <p className="public-eyebrow">{c.services.eyebrow}</p>
              <h2 id="services-title">{c.services.title}</h2>
            </div>
            <p>{c.services.lead}</p>
          </div>
          <SiteServices lang={lang} />
          <div className="public-contact-strip">
            <span>{c.services.contactPrompt}</span>
            <a href={c.org.phoneHref}>{c.services.contactCta}</a>
          </div>
        </div>
      </section>

      <section id="faq" className="public-section public-faq-section" aria-labelledby="faq-title">
        <div className="public-shell public-faq-layout">
          <div className="public-section__heading public-faq-heading">
            <p className="public-eyebrow">{c.faq.eyebrow}</p>
            <h2 id="faq-title">{c.faq.title}</h2>
            <p>{c.faq.lead}</p>
            <a href={c.org.phoneHref}>{c.faq.contact}</a>
          </div>
          <SiteFaq lang={lang} />
        </div>
      </section>
    </>
  );
}
