-- IPS knowledge content and reference data are public only after publication.
-- Event records remain private to their owning authenticated user.
create table if not exists public.ips_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  body jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ips_articles_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table if not exists public.ips_signatures (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  engine text not null check (engine in ('suricata', 'snort', 'sophos', 'other')),
  name text not null,
  description text not null default '',
  severity text not null default 'medium' check (severity in ('info', 'low', 'medium', 'high', 'critical')),
  reference_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (engine, external_id)
);

create table if not exists public.ips_cves (
  cve_id text primary key check (cve_id ~ '^CVE-[0-9]{4}-[0-9]{4,}$'),
  summary text not null default '',
  cvss_score numeric(3,1) check (cvss_score between 0 and 10),
  published_at timestamptz,
  reference_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.ips_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  vendor text not null,
  description text not null default '',
  reference_url text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ips_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  event_source text not null default 'user',
  simulated boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ips_articles enable row level security;
alter table public.ips_signatures enable row level security;
alter table public.ips_cves enable row level security;
alter table public.ips_products enable row level security;
alter table public.ips_events enable row level security;

create policy "Public reads published IPS articles" on public.ips_articles for select to anon, authenticated using (published);
create policy "Public reads published IPS signatures" on public.ips_signatures for select to anon, authenticated using (published);
create policy "Public reads CVE intelligence" on public.ips_cves for select to anon, authenticated using (true);
create policy "Public reads published IPS products" on public.ips_products for select to anon, authenticated using (published);
create policy "Users read own IPS events" on public.ips_events for select to authenticated using (auth.uid() = owner_id);
create policy "Users add own IPS events" on public.ips_events for insert to authenticated with check (auth.uid() = owner_id);

revoke all on public.ips_articles, public.ips_signatures, public.ips_cves, public.ips_products, public.ips_events from anon, authenticated;
grant select on public.ips_articles, public.ips_signatures, public.ips_cves, public.ips_products to anon, authenticated;
grant select, insert on public.ips_events to authenticated;
