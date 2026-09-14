CREATE TABLE public.billing_products (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('subscription','credits','addon')),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  plan_id text REFERENCES public.plans(id),
  credits integer NOT NULL DEFAULT 0,
  interval text NOT NULL DEFAULT 'one_time' CHECK (interval IN ('one_time','month','year')),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.billing_products TO anon;
GRANT SELECT ON public.billing_products TO authenticated;
GRANT ALL ON public.billing_products TO service_role;
ALTER TABLE public.billing_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are publicly readable" ON public.billing_products FOR SELECT USING (active);

INSERT INTO public.billing_products (id, kind, name, description, price_cents, plan_id, credits, interval, sort_order) VALUES
  ('team-monthly','subscription','Team SOC (monthly)','10,000 scans/month, 10 targets per run, full playbook automation.',14900,'team',0,'month',1),
  ('credits-5k','credits','Scan credit pack','5,000 extra scans on top of your plan. Credits never expire.',4900,NULL,5000,'one_time',2),
  ('monitoring-asset','addon','Attack-surface monitoring','Daily re-scan of one external asset with diff alerts.',800,NULL,0,'month',3),
  ('white-label','addon','White-label reporting','Branded PDF exposure reports for your own clients.',9900,NULL,0,'month',4);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.billing_products(id),
  provider text NOT NULL DEFAULT 'streampay',
  provider_ref text,
  checkout_url text,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','cancelled','refunded')),
  fulfilled boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX orders_provider_ref_idx ON public.orders (provider, provider_ref) WHERE provider_ref IS NOT NULL;
CREATE INDEX orders_user_idx ON public.orders (user_id, created_at DESC);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX credit_ledger_user_idx ON public.credit_ledger (user_id, created_at DESC);
GRANT SELECT ON public.credit_ledger TO authenticated;
GRANT ALL ON public.credit_ledger TO service_role;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own credits" ON public.credit_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);