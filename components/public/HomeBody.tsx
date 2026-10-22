import { siteCopy, type SiteLang } from "@/lib/public-content";
import { CodeLookup } from "./CodeLookup";
import { FaqSection, ServicesSection } from "./SiteSections";

export function HomeBody({ lang }: { lang: SiteLang }) {
  const c = siteCopy(lang);

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="site-container hero__grid">
          <div className="hero__copy">
            <span className="eyebrow">{c.hero.eyebrow}</span>
            <h1 className="hero__title" id="hero-title">
              {c.hero.title}
            </h1>
            <p className="hero__lead">{c.hero.lead}</p>
            <div className="hero__actions">
              <a className="site-btn site-btn--primary" href="#tra-cuu">
                {c.hero.primary}
              </a>
              <a className="site-btn site-btn--outline" href={c.org.phoneHref}>
                {c.hero.secondary}
              </a>
            </div>
            <p className="hero__facts-label">{c.hero.factsLabel}</p>
            <ul className="hero__facts">
              {c.hero.facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </div>

          <CodeLookup lang={lang} />
        </div>
      </section>

      <ServicesSection lang={lang} />
      <FaqSection lang={lang} />
    </>
  );
}
