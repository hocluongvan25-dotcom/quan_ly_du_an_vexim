import { siteCopy, type SiteLang } from "@/lib/public-content";

export function SiteServices({ lang }: { lang: SiteLang }) {
  const c = siteCopy(lang);

  return (
    <div className="public-services-grid">
      {c.services_list.map((service, index) => (
        <article className="public-service-card" key={service.id}>
          <div className="service__top">
            <span className="service__no" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="service__tag">{service.tag}</span>
          </div>
          <h3 className="service__title">{service.title}</h3>
          <p className="service__desc">{service.desc}</p>
          <ul className="service__list">
            {service.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <div className="service__cta">
            <a className="site-btn site-btn--outline" href={c.org.phoneHref}>
              {service.cta}
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

export function SiteFaq({ lang }: { lang: SiteLang }) {
  const c = siteCopy(lang);

  return (
    <div className="faq-list">
      {c.faqs.map((item) => (
        <details className="faq-item" key={item.q}>
          <summary className="faq-item__q">
            <span className="faq-item__text">{item.q}</span>
            <span className="faq-item__icon" aria-hidden="true" />
          </summary>
          <div className="faq-item__a">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
