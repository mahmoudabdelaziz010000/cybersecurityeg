import { createFileRoute } from "@tanstack/react-router";
import { FACEBOOK_PAGE_URL, headLanguage, pageHead, whatsappUrl, WHATSAPP_NUMBER } from "@/lib/seo";
import { Clock3, Facebook, Linkedin, Mail, MessagesSquare, Phone, ShieldQuestion } from "lucide-react";
import { useLanguage } from "@/lib/language";

const TITLE = "Cybersecurity Consulting in Egypt | Contact SentinelGrid";
const DESCRIPTION =
  "Contact SentinelGrid for cybersecurity consulting in Egypt. Discuss security assessments, attack-surface reviews, SOC/XDR and firewall security on WhatsApp.";

export const Route = createFileRoute("/contact")({
  head: (ctx) => ({
    ...pageHead({ path: "/contact", title: TITLE, description: DESCRIPTION, lang: headLanguage(ctx) }),
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        name: "SentinelGrid Cybersecurity Consulting",
        url: "https://cybersecurityeg.lovable.app/contact",
        telephone: `+${WHATSAPP_NUMBER}`,
        areaServed: { "@type": "Country", name: "Egypt" },
        serviceType: ["Cybersecurity consulting", "Security assessments", "SOC and XDR advisory", "Firewall security"],
      }),
    }],
  }),
  component: Contact,
});

const CHANNELS = [
  { icon: MessagesSquare, title: "Cybersecurity consulting", body: "Discuss security assessments, attack-surface reviews, SOC/XDR and firewall security.", email: "mahmoudabdelaziz@live.com" },
  {
    icon: MessagesSquare,
    title: "Support",
    body: "For account, plan and technical questions.",
    email: "mahmoudabdelaziz@live.com",
  },
  { icon: ShieldQuestion, title: "Security disclosure", body: "Report a vulnerability responsibly and privately.", email: "mahmoudabdelaziz@live.com" },
];

function Contact() {
  const { t, isArabic } = useLanguage();

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <header className="max-w-2xl">
        <p className="label-mono">{t("Contact")}</p>
        <h1 className="mt-3 text-4xl font-bold">{t("Contact SentinelGrid")}</h1>
        <p className="mt-4 text-muted-foreground">
          {t("Tell us what you're trying to defend")}
        </p>
        <a href={whatsappUrl(isArabic ? "مرحباً، أود مناقشة استشارات الأمن السيبراني لمؤسستي." : "Hello, I would like to discuss cybersecurity consulting for my organization.")} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#25D366] px-5 py-3 text-sm font-semibold text-[#071b10] hover:brightness-95">
          {isArabic ? "تواصل عبر واتساب" : "Chat on WhatsApp"} · +20 1000 033316
        </a>
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
              {c.title === "Cybersecurity consulting" && (
                <a href={whatsappUrl(isArabic ? "مرحباً، أود مناقشة استشارات الأمن السيبراني لمؤسستي." : "Hello, I would like to discuss cybersecurity consulting for my organization.")} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
                  {t("Start a WhatsApp conversation")}
                </a>
              )}
            </div>
          ))}
          <div className="surface p-5">
            <h2 className="label-mono">{t("Direct contact")}</h2>
            <ul className="mt-3 space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-primary" aria-hidden="true" />
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
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
