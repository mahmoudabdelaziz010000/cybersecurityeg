import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Activity, BookOpen, Boxes, ChevronRight, GitBranch, LayoutDashboard, Menu, Radar, ScanSearch, ShieldCheck, ShieldHalf, type LucideIcon } from "lucide-react";
import { FacebookCta } from "@/components/facebook-cta";
import { LanguageToggle } from "@/components/language-toggle";
import { SiteFooter } from "@/components/site-footer";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SOPHOS_PROVIDER_ID, navActiveFor, providersOf, telemetrySplat, type NavActive } from "@/lib/console-nav";
import { useLanguage } from "@/lib/language";
import { SECTION_META, SOPHOS_SECTIONS, type SophosSectionId } from "@/lib/sophos-catalog";
import { GROUPS, type Group } from "@/lib/xdr-demo";
import { GROUP_STYLE, groupLabel } from "@/lib/xdr-ui";

type StaticTo = "/" | "/xdr" | "/osint-hub" | "/owasp" | "/workflows" | "/attack-surface" | "/threat-intel" | "/ips" | "/recon-guide" | "/platform" | "/contact";
/** Where a menu entry goes: a fixed page, a /telemetry/* page, the Sophos dashboard, or one Sophos section. */
type Dest = { to: StaticTo } | { splat: string } | { section: SophosSectionId } | { sophos: true };

const TOOLS: { dest: Dest; label: readonly [string, string]; icon: LucideIcon }[] = [
  { dest: { to: "/osint-hub" }, label: ["OSINT Hub", "مركز OSINT"], icon: ScanSearch },
  { dest: { to: "/owasp" }, label: ["OWASP Scanner", "فاحص OWASP"], icon: ShieldCheck },
  { dest: { to: "/workflows" }, label: ["Workflows", "سير العمل"], icon: GitBranch },
  { dest: { to: "/attack-surface" }, label: ["Attack surface", "سطح الهجوم"], icon: Radar },
  { dest: { to: "/threat-intel" }, label: ["Threat intel", "استخبارات التهديدات"], icon: Activity },
  { dest: { section: "ips" }, label: ["IPS Security Center", "مركز أمن IPS"], icon: ShieldHalf },
  { dest: { to: "/recon-guide" }, label: ["Recon guide", "دليل الاستطلاع"], icon: BookOpen },
  { dest: { to: "/platform" }, label: ["Platform overview", "نظرة عامة على المنصة"], icon: Boxes },
];

function DestLink({ dest, active, className, onClick, children }: { dest: Dest; active: boolean; className: string; onClick?: (() => void) | undefined; children: ReactNode }) {
  const current = active ? ("page" as const) : undefined;
  if ("splat" in dest) {
    return <Link to="/telemetry/$" params={{ _splat: dest.splat }} className={className} onClick={onClick} aria-current={current}>{children}</Link>;
  }
  if ("section" in dest) {
    const section = dest.section;
    return <Link to="/xdr/firewalls" search={(prev) => ({ ...prev, section })} className={className} onClick={onClick} aria-current={current}>{children}</Link>;
  }
  if ("sophos" in dest) {
    return <Link to="/xdr/firewalls" search={(prev) => ({ ...prev, section: "overview" as const })} className={className} onClick={onClick} aria-current={current}>{children}</Link>;
  }
  return <Link to={dest.to} className={className} onClick={onClick} aria-current={current}>{children}</Link>;
}

const IDLE = "text-muted-foreground hover:bg-accent/60 hover:text-foreground";

function Leaf({ dest, active, onNavigate, children }: { dest: Dest; active: boolean; onNavigate?: (() => void) | undefined; children: ReactNode }) {
  return (
    <li>
      <DestLink dest={dest} active={active} onClick={onNavigate} className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] transition-colors ${active ? "bg-accent text-foreground" : IDLE}`}>
        {children}
      </DestLink>
    </li>
  );
}

/** A collapsible menu entry. With `dest` the label navigates and the chevron toggles; without it the whole label toggles. */
function Branch({ id, icon: Icon, iconClass = "", label, count, state, open, onToggle, dest, onNavigate, toggleLabel, nested = false, children }: {
  id: string; icon?: LucideIcon; iconClass?: string; label: string; count?: number; state: "page" | "ancestor" | "none"; open: boolean;
  onToggle: () => void; dest?: Dest; onNavigate?: (() => void) | undefined; toggleLabel: string; nested?: boolean; children: ReactNode;
}) {
  const tone = state === "page" ? "bg-accent text-foreground" : state === "ancestor" ? "text-foreground" : IDLE;
  const body = (
    <>
      {Icon && <Icon className={`size-4 shrink-0 ${iconClass}`} aria-hidden="true" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && <span className="font-mono text-[10px] text-muted-foreground">{count}</span>}
    </>
  );
  const text = nested ? "text-[13px]" : "text-sm";
  return (
    <li>
      <div className={`flex items-center rounded-md transition-colors ${tone}`}>
        {dest ? (
          <DestLink dest={dest} active={state === "page"} onClick={onNavigate} className={`flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 ${text}`}>{body}</DestLink>
        ) : (
          <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id} className={`flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-start ${text}`}>{body}</button>
        )}
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id} aria-label={toggleLabel} className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-foreground">
          <ChevronRight className={`size-4 transition-transform ${open ? "rotate-90" : "rtl:rotate-180"}`} aria-hidden="true" />
        </button>
      </div>
      {open && <ul id={id} className="ms-4 mt-1 space-y-0.5 border-s border-border ps-2">{children}</ul>}
    </li>
  );
}

function ConsoleNav({ active, pathname, onNavigate }: { active: NavActive; pathname: string; onNavigate?: (() => void) | undefined }) {
  const { isArabic } = useLanguage();
  const idx = isArabic ? 1 : 0;
  const l = (en: string, ar: string) => (isArabic ? ar : en);
  // Entries open by themselves when the current page is inside them; a click overrides that.
  const [manual, setManual] = useState<Record<string, boolean>>({});
  const isOpen = (key: string, auto: boolean) => manual[key] ?? auto;
  const toggle = (key: string, auto: boolean) => setManual((current) => ({ ...current, [key]: !(current[key] ?? auto) }));
  const toggleLabel = (name: string) => l(`Expand or collapse ${name}`, `توسيع أو طي ${name}`);

  const dashboardActive = active.area === "soc" || active.area === "settings";

  return (
    <nav aria-label={l("Console menu", "قائمة لوحة التحكم")} className="flex min-h-0 flex-1 flex-col">
      <ul className="space-y-0.5">
        <Branch
          id="nav-dashboard" icon={LayoutDashboard} iconClass="text-primary" label={l("Dashboard", "لوحة التحكم")}
          state={dashboardActive ? "ancestor" : "none"} open={isOpen("dashboard", dashboardActive)} onToggle={() => toggle("dashboard", dashboardActive)} toggleLabel={toggleLabel(l("Dashboard", "لوحة التحكم"))}
        >
          <Leaf dest={{ to: "/" }} active={active.area === "soc"} onNavigate={onNavigate}>{l("SOC overview", "نظرة عامة على مركز العمليات")}</Leaf>
          <Leaf dest={{ to: "/xdr" }} active={active.area === "settings"} onNavigate={onNavigate}>{l("Telemetry settings", "إعدادات البيانات")}</Leaf>
        </Branch>
      </ul>

      <p className="label-mono mt-5 px-3 pb-1.5">{l("TELEMETRY", "مصادر البيانات")}</p>
      <ul className="space-y-0.5">
        {GROUPS.map((group: Group) => {
          const style = GROUP_STYLE[group];
          const groupActive = active.area === "telemetry" && active.group === group;
          const pageActive = groupActive && !active.providerId;
          const providers = providersOf(group);
          const key = `group-${group}`;
          const sophosOpen = isOpen("sophos", active.providerId === SOPHOS_PROVIDER_ID);
          return (
            <Branch
              key={group} id={`nav-${key}`} icon={style.icon} iconClass={style.text} label={groupLabel(group, isArabic)} count={providers.length}
              state={pageActive ? "page" : groupActive ? "ancestor" : "none"} open={isOpen(key, groupActive)} onToggle={() => toggle(key, groupActive)}
              dest={{ splat: telemetrySplat(group) }} onNavigate={onNavigate} toggleLabel={toggleLabel(groupLabel(group, isArabic))}
            >
              <Leaf dest={{ splat: telemetrySplat(group) }} active={pageActive} onNavigate={onNavigate}>{l("Dashboard", "لوحة التحكم")}</Leaf>
              {providers.map((provider) =>
                provider.id === SOPHOS_PROVIDER_ID ? (
                  <Branch
                    key={provider.id} id="nav-sophos" nested label={provider.name}
                    state={active.providerId === SOPHOS_PROVIDER_ID ? "ancestor" : "none"} open={sophosOpen} onToggle={() => toggle("sophos", active.providerId === SOPHOS_PROVIDER_ID)}
                    dest={{ sophos: true }} onNavigate={onNavigate} toggleLabel={toggleLabel(provider.name)}
                  >
                    {SOPHOS_SECTIONS.map((section) => (
                      <Leaf key={section} dest={{ section }} active={active.providerId === SOPHOS_PROVIDER_ID && active.section === section} onNavigate={onNavigate}>
                        {SECTION_META[section].title[idx]}
                      </Leaf>
                    ))}
                  </Branch>
                ) : (
                  <Leaf key={provider.id} dest={{ splat: telemetrySplat(group, provider) }} active={active.providerId === provider.id} onNavigate={onNavigate}>
                    <span className="truncate">{provider.name}</span>
                  </Leaf>
                ),
              )}
            </Branch>
          );
        })}
      </ul>

      <p className="label-mono mt-5 px-3 pb-1.5">{l("TOOLS", "الأدوات")}</p>
      <ul className="space-y-0.5">
        {TOOLS.map((tool) => {
          const isActive = "to" in tool.dest
            ? pathname === tool.dest.to
            : false;
          const key = "to" in tool.dest ? tool.dest.to : "section" in tool.dest ? tool.dest.section : "sophos";
          return (
            <li key={key}>
              <DestLink dest={tool.dest} active={isActive} onClick={onNavigate} className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${isActive ? "bg-accent text-foreground" : IDLE}`}>
                <tool.icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{tool.label[idx]}</span>
              </DestLink>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-4">
        <Link to="/contact" onClick={onNavigate} className="px-3 text-sm text-muted-foreground hover:text-foreground">{l("Contact", "اتصل بنا")}</Link>
        <LanguageToggle compact />
      </div>
    </nav>
  );
}

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link to="/" onClick={onClick} className="flex items-center gap-2.5" aria-label="SentinelGrid">
      <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
        <ShieldHalf className="size-[18px]" aria-hidden="true" />
      </span>
      <span className="font-display text-[15px] font-semibold">Sentinel<span className="text-primary">Grid</span></span>
    </Link>
  );
}

/** Sidebar layout shared by every page: menu on the left (right in Arabic), content, footer. */
export function ConsoleShell({ children }: { children: ReactNode }) {
  const { isArabic } = useLanguage();
  const pathname = useLocation({ select: (location) => location.pathname });
  const section = useLocation({ select: (location) => (location.search as { section?: unknown }).section });
  const active = navActiveFor(pathname, section);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile drawer after navigating.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground">
        {isArabic ? "تخطي إلى المحتوى" : "Skip to content"}
      </a>

      <aside data-no-translate className="hidden w-72 shrink-0 flex-col gap-5 overflow-y-auto border-e border-border bg-panel px-3 py-4 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="px-2"><Brand /></div>
        <ConsoleNav active={active} pathname={pathname} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-panel/95 px-4 backdrop-blur lg:hidden">
          <Brand />
          <div className="flex items-center gap-2">
            <LanguageToggle compact />
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <button type="button" aria-label={isArabic ? "فتح القائمة" : "Open menu"} className="inline-flex size-9 items-center justify-center rounded-md border border-border hover:bg-accent">
                  <Menu className="size-4" aria-hidden="true" />
                </button>
              </SheetTrigger>
              <SheetContent side={isArabic ? "right" : "left"} data-no-translate className="flex w-[19rem] max-w-[85vw] flex-col gap-4 overflow-y-auto bg-panel px-3 py-4">
                <SheetTitle className="sr-only">{isArabic ? "قائمة لوحة التحكم" : "Console menu"}</SheetTitle>
                <SheetDescription className="sr-only">{isArabic ? "التنقل بين لوحة التحكم ومصادر البيانات والأدوات" : "Navigate the dashboard, telemetry sources and tools"}</SheetDescription>
                <div className="px-2"><Brand onClick={() => setDrawerOpen(false)} /></div>
                <ConsoleNav active={active} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main id="main" className="flex-1">{children}</main>
        <FacebookCta />
        <SiteFooter />
      </div>
    </div>
  );
}
