CREATE TABLE public.monitored_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fqdn text NOT NULL,
  challenge_hash text NOT NULL,
  challenge_expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fqdn),
  CHECK (length(fqdn) BETWEEN 3 AND 253)
);

-- Included verified-domain slots scale with the existing subscription plans.
ALTER TABLE public.plans ADD COLUMN max_monitored_domains integer;
UPDATE public.plans
SET max_monitored_domains = CASE id
  WHEN 'recon' THEN 1
  WHEN 'team' THEN 10
  WHEN 'enterprise' THEN NULL
  ELSE 1
END;
CREATE INDEX monitored_domains_user_created_idx ON public.monitored_domains (user_id, created_at DESC);
ALTER TABLE public.monitored_domains ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.monitored_domains TO service_role;
CREATE POLICY "Users can view their own monitored domains" ON public.monitored_domains
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.domain_assessment_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monitored_domain_id uuid NOT NULL REFERENCES public.monitored_domains(id) ON DELETE CASCADE,
  collection_mode text NOT NULL DEFAULT 'passive' CHECK (collection_mode = 'passive'),
  surface jsonb NOT NULL DEFAULT '{}'::jsonb,
  campaign_matches jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX domain_assessment_runs_user_created_idx ON public.domain_assessment_runs (user_id, created_at DESC);
CREATE INDEX domain_assessment_runs_domain_created_idx ON public.domain_assessment_runs (monitored_domain_id, created_at DESC);
ALTER TABLE public.domain_assessment_runs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.domain_assessment_runs TO service_role;
CREATE POLICY "Users can view their own domain assessment runs" ON public.domain_assessment_runs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_monitored_domains_updated_at BEFORE UPDATE ON public.monitored_domains
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
