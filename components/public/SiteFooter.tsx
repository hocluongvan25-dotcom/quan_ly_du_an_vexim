import { Brand } from "./Brand";
import { SITE_PATHS, siteCopy, type SiteLang } from "@/lib/public-content";

export function SiteFooter({ lang }: { lang: SiteLang }) {
  const c = siteCopy(lang);

  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="site-footer__top">
          <div>
            <Brand light href={SITE_PATHS[lang]} />
            <p className="site-footer__brandline">{c.footer.brandline}</p>
          </div>

          <div>
            <p className="site-footer__col-title">{c.footer.companyTitle}</p>
            <ul className="site-footer__list">
              <li>{c.org.legal}</li>
              {c.org.addressLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="site-footer__col-title">{c.footer.contactTitle}</p>
            <ul className="site-footer__list">
              <li>
                {c.footer.hotlineLabel}:{" "}
                <a href={c.org.phoneHref}>{c.org.phone}</a>
              </li>
              <li>
                {c.footer.emailLabel}:{" "}
                <a href={`mailto:${c.org.email}`}>{c.org.email}</a>
              </li>
              <li>
                {c.footer.websiteLabel}:{" "}
                <a href={c.org.website} target="_blank" rel="noopener noreferrer">
                  {c.org.websiteLabel}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="site-footer__col-title">{c.footer.linkTitle}</p>
            <ul className="site-footer__list">
              {c.footer.links.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <a href={link.href} rel={link.nofollow ? "nofollow" : undefined}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>{c.footer.copyright}</span>
          <span className="site-footer__langs">
            <a href={SITE_PATHS.vi} hrefLang="vi" lang="vi">
              Tiếng Việt
            </a>
            <span aria-hidden="true"> / </span>
            <a href={SITE_PATHS.en} hrefLang="en" lang="en">
              English
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
