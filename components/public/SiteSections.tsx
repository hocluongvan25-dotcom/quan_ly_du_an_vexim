import { siteCopy, type SiteLang } from "@/lib/public-content";

export function ServicesSection({ lang }: { lang: SiteLang }) {
  const c = siteCopy(lang);

  return (
    <section className="site-section site-section--white" id="dich-vu" aria-labelledby="services-title">
      <div className="site-container">
        <div className="site-section__head">
          <div>
            <span className="site-section__index" aria-hidden="true">
              {c.services.index}
            </span>
            <h2 className="site-section__title" id="services-title">
              {c.services.title}
            </h2>
          </div>
          <div>
            <p className="site-section__lead">{c.services.lead}</p>
            <p className="site-section__contact">
              {c.services.contact.map((segment, index) =>
                segment.href ? (
                  <a key={index} href={segment.href}>
                    {segment.text}
                  </a>
                ) : (
                  <span key={index}>{segment.text}</span>
                ),
              )}
            </p>
          </div>
        </div>

        <div className="services">
          {c.services_list.map((service) => (
            <article className="service" key={service.id}>
              <div className="service__top">
                <span className="service__no" aria-hidden="true">
                  {service.no}
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
                <a className="site-btn site-btn--outline site-btn--sm" href={c.org.phoneHref}>
                  {service.cta}
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FaqSection({ lang }: { lang: SiteLang }) {
  const c = siteCopy(lang);

  return (
    <section className="site-section" id="faq" aria-labelledby="faq-title">
      <div className="site-container faq-wrap">
        <div className="faq-intro">
          <span className="site-section__index" aria-hidden="true">
            {c.faq.index}
          </span>
          <h2 className="site-section__title" id="faq-title">
            {c.faq.title}
          </h2>
          <p className="faq-intro__lead">{c.faq.lead}</p>
          <div className="faq-intro__contact">
            <div>{c.faq.contact}</div>
            <a href={c.org.phoneHref}>{c.org.phone}</a>
          </div>
        </div>

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
      </div>
    </section>
  );
}
