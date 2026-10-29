import { createFileRoute } from "@tanstack/react-router";
import { absoluteUrl, FACEBOOK_PAGE_URL } from "@/lib/seo";
import { Clock3, Facebook, Linkedin, Mail, MessagesSquare, Phone, ShieldQuestion } from "lucide-react";
import { useLanguage } from "@/lib/language";

const TITLE = "Contact SentinelGrid — Sales, Support & Security Reports";
const DESCRIPTION =
  "Talk to the SentinelGrid team about Enterprise terms, managed triage retainers, custom connectors or responsible disclosure.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/contact") },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/contact") }],
  }),
  component: Contact,
});

const CHANNELS = [
  { icon: Mail, title: "Sales", body: "For Enterprise pricing, pilots and procurement.", email: "mahmoudabdelaziz@live.com" },
  {
    icon: MessagesSquare,
    title: "Support",
    body: "For account, plan and technical questions.",
    email: "mahmoudabdelaziz@live.com",
  },
  { icon: ShieldQuestion, title: "Security disclosure", body: "Report a vulnerability responsibly and privately.", email: "mahmoudabdelaziz@live.com" },
];

function Contact() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <header className="max-w-2xl">
        <p className="label-mono">{t("Contact")}</p>
        <h1 className="mt-3 text-4xl font-bold">{t("Contact SentinelGrid")}</h1>
        <p className="mt-4 text-muted-foreground">
          {t("Tell us what you're trying to defend")}
        </p>
      </header>

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CHANNELS.map((c) => (
            <div key={c.title} className="surface p-5">
              <c.icon className="size-4 text-primary" aria-hidden="true" />
              <h2 className="mt-3 text-sm font-semibold">{t(c.title)}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{t(c.body)}</p>
              {c.email ? (
                <a
                  href={`mailto:${c.email}`}
                  className="mt-2 inline-block text-sm text-primary hover:underline"
                >
                  {c.email}
                </a>
              ) : null}
            </div>
          ))}
          <div className="surface p-5">
            <h2 className="label-mono">{t("Direct contact")}</h2>
            <ul className="mt-3 space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-primary" aria-hidden="true" />
                <a href="tel:+201000033316" className="text-primary hover:underline">
                  +20 1000 033 316
                </a>
                <span className="text-muted-foreground">({t("Phone / WhatsApp")})</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="size-4 text-primary" aria-hidden="true" />
                <a
                  href="mailto:mahmoudabdelaziz@live.com"
                  className="text-primary hover:underline"
                >
                  mahmoudabdelaziz@live.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Linkedin className="size-4 text-primary" aria-hidden="true" />
                <span className="text-muted-foreground">Mahmoud Abdelaziz | LinkedIn</span>
              </li>
              <li className="flex items-center gap-2">
                <Facebook className="size-4 text-primary" aria-hidden="true" />
                <a
                  href={FACEBOOK_PAGE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {t("SentinelGrid on Facebook")}
                </a>
              </li>
            </ul>
          </div>
          <div className="surface p-5">
            <Clock3 className="size-4 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold">{t("Business hours")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("Egypt time, 11:00 AM – 3:00 PM.")}
            </p>
          </div>
      </div>
    </div>
  );
}
