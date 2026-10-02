import { Languages } from "lucide-react";
import { useLanguage } from "@/lib/language";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();
  const next = language === "en" ? "ar" : "en";
  return (
    <button
      type="button"
      onClick={() => setLanguage(next)}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-accent"
      aria-label={language === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
      title={language === "en" ? "العربية" : "English"}
    >
      <Languages className="size-4" aria-hidden="true" />
      {!compact && <span>{language === "en" ? "العربية" : "English"}</span>}
    </button>
  );
}