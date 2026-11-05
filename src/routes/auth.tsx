import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LockKeyhole, ShieldHalf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { headLanguage, pageHead } from "@/lib/seo";

const TITLE = "Sign in to SentinelGrid | XDR Security Dashboard";
const DESCRIPTION = "Sign in to your SentinelGrid account, or explore the free XDR demo without an account.";

export const Route = createFileRoute("/auth")({
  head: (ctx) => ({
    ...pageHead({ path: "/auth", title: TITLE, description: DESCRIPTION, lang: headLanguage(ctx) }),
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const copy = {
    title: mode === "signin" ? "Welcome back" : "Create your account",
    submit: mode === "signin" ? "Sign in" : "Create account",
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setErrorMessage("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName.trim() },
          },
        });
        if (error) throw error;
        if (data.session) {
          await navigate({ to: "/", replace: true });
        } else {
          setNotice("Account created. Check your email to confirm before signing in.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await navigate({ to: "/", replace: true });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "We could not complete that request.");
    } finally {
      setBusy(false);
    }
  };

  const signInWith = async (provider: "google" | "lovable") => {
    setBusy(true);
    setNotice("");
    setErrorMessage("");
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sign-in could not be started.");
      setBusy(false);
    }
  };

  if (user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <section className="surface-raised p-6 sm:p-8">
          <ShieldHalf className="size-7 text-primary" aria-hidden="true" />
          <h1 className="mt-5 text-2xl font-semibold">You’re signed in</h1>
          <p className="mt-2 break-all text-sm text-muted-foreground">{user.email}</p>
          <Button asChild className="mt-6"><Link to="/">Open XDR dashboard</Link></Button>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_420px]">
      <section className="max-w-xl">
        <p className="label-mono flex items-center gap-2"><LockKeyhole className="size-4 text-primary" /> SENTINELGRID ACCOUNT</p>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{copy.title}</h1>
        <p className="mt-4 text-muted-foreground">Sign in to keep your workspace profile. The free XDR demo remains open without an account.</p>
        <Button asChild variant="link" className="mt-5 px-0"><Link to="/"><ArrowLeft /> Back to the free demo</Link></Button>
      </section>

      <section className="surface-raised p-5 sm:p-7">
        <div className="mb-6 grid grid-cols-2 border-b border-border" role="tablist" aria-label="Account access">
          {(["signin", "signup"] as const).map((value) => (
            <Button key={value} type="button" variant="ghost" role="tab" aria-selected={mode === value} className={`rounded-none border-b-2 ${mode === value ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`} onClick={() => { setMode(value); setNotice(""); setErrorMessage(""); }}>
              {value === "signin" ? "Sign in" : "Create account"}
            </Button>
          ))}
        </div>

        <form className="space-y-4" onSubmit={submit}>
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input id="display-name" autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={80} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
          <Button className="w-full" type="submit" disabled={busy}>{busy ? "Please wait…" : copy.submit}</Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or continue with<span className="h-px flex-1 bg-border" /></div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void signInWith("google")}>Google</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void signInWith("lovable")}>Lovable</Button>
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">Demo access never requires registration or provider credentials.</p>
        {notice && <p className="mt-4 border-s-2 border-clean ps-3 text-sm text-clean" role="status">{notice}</p>}
        {errorMessage && <p className="mt-4 border-s-2 border-destructive ps-3 text-sm text-destructive" role="alert">{errorMessage}</p>}
      </section>
    </div>
  );
}