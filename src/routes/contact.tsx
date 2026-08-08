import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MessagesSquare, ShieldQuestion } from "lucide-react";

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
      { property: "og:url", content: "/contact" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: Contact,
});

const CHANNELS = [
  { icon: Mail, title: "Sales", body: "Enterprise pricing, procurement paperwork and pilots." },
  { icon: MessagesSquare, title: "Support", body: "Plan questions, billing and connector issues." },
  { icon: ShieldQuestion, title: "Disclosure", body: "Found something in our platform? Tell us first." },
];

function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <header className="max-w-2xl">
        <p className="label-mono">Contact</p>
        <h1 className="mt-3 text-4xl font-bold">Tell us what you're trying to defend</h1>
        <p className="mt-4 text-muted-foreground">
          Enterprise quotes, managed triage retainers and custom connectors all start with a short
          conversation about your estate and volume.
        </p>
      </header>

      <div className="mt-10 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="surface-raised p-7">
          {sent ? (
            <div className="py-10 text-center">
              <h2 className="font-display text-xl font-semibold">Message queued</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Nothing is transmitted yet — connect a backend to deliver this form to your inbox or
                CRM.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-6 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
              >
                Write another
              </button>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="label-mono">
                    Name
                  </label>
                  <input
                    id="name"
                    required
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="label-mono">
                    Work email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="topic" className="label-mono">
                  Topic
                </label>
                <select
                  id="topic"
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                >
                  <option>Enterprise pricing</option>
                  <option>Managed triage retainer</option>
                  <option>Custom connector</option>
                  <option>Support</option>
                  <option>Responsible disclosure</option>
                </select>
              </div>
              <div>
                <label htmlFor="message" className="label-mono">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={6}
                  required
                  className="mt-2 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                />
              </div>
              <button
                type="submit"
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Send message
              </button>
            </form>
          )}
        </section>

        <aside className="space-y-3">
          {CHANNELS.map((c) => (
            <div key={c.title} className="surface p-5">
              <c.icon className="size-4 text-primary" aria-hidden="true" />
              <h2 className="mt-3 text-sm font-semibold">{c.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.body}</p>
            </div>
          ))}
          <div className="surface p-5">
            <h2 className="label-mono">Response time</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sales within one business day. Team SOC support within eight business hours. Enterprise
              per SLA.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
