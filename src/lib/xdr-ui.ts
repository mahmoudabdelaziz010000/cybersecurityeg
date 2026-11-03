import { Cloud, Cpu, Globe, Mail, Monitor, Network, ServerCog, ShieldCheck } from "lucide-react";
import type { Group, Severity } from "./xdr-demo";

/** Icon and Tailwind colour classes for each telemetry source group, shared by the XDR and SOC pages. */
export const GROUP_STYLE: Record<Group, { icon: typeof Monitor; text: string }> = {
  Firewalls: { icon: ShieldCheck, text: "text-caution" },
  Endpoints: { icon: Monitor, text: "text-primary" },
  Servers: { icon: ServerCog, text: "text-clean" },
  Cloud: { icon: Cloud, text: "text-xdr-cloud" },
  Network: { icon: Network, text: "text-xdr-other" },
  Email: { icon: Mail, text: "text-primary" },
  "AI APIs": { icon: Cpu, text: "text-xdr-ai" },
  "Other APIs": { icon: Globe, text: "text-xdr-other" },
};

const GROUP_LABELS: Record<Group, readonly [string, string]> = {
  Firewalls: ["Firewalls", "الجدران النارية"],
  Endpoints: ["Endpoints", "الأجهزة الطرفية"],
  Servers: ["Windows & Linux servers", "خوادم Windows وLinux"],
  Cloud: ["Cloud", "السحابة"],
  Network: ["Network sensors", "مستشعرات الشبكة"],
  Email: ["Email", "البريد الإلكتروني"],
  "AI APIs": ["AI APIs", "واجهات الذكاء الاصطناعي"],
  "Other APIs": ["Other APIs", "واجهات أخرى"],
};

export function groupLabel(group: Group, isArabic: boolean) {
  return GROUP_LABELS[group][isArabic ? 1 : 0];
}

export const SEVERITY_STYLE: Record<Severity, string> = {
  Critical: "text-malicious bg-malicious/10 border-malicious/25",
  High: "text-caution bg-caution/10 border-caution/25",
  Medium: "text-xdr-cloud bg-xdr-cloud/10 border-xdr-cloud/25",
  Low: "text-primary bg-primary/10 border-primary/25",
  Info: "text-muted-foreground bg-muted border-border",
};

/** CSS colour tokens for charts; the legend always repeats the label so colour never carries meaning alone. */
export const SEVERITY_COLOR: Record<Severity, string> = {
  Critical: "var(--malicious)",
  High: "var(--caution)",
  Medium: "var(--xdr-cloud)",
  Low: "var(--primary)",
  Info: "var(--xdr-other)",
};
