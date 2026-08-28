-- AI SEO / GEO tool — initial schema
-- All tables are restricted to the owning user via Row Level Security (RLS).
-- NOTE: RLS controls row access; table-level GRANT (at the bottom) is also required.

-- ============================================================
-- profiles: 1-1 with auth.users
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Automatically create a profile when a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent the SECURITY DEFINER function from being called via REST RPC
-- (the trigger itself is unaffected since it runs with the table owner's privileges).
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ============================================================
-- sites: URLs tracked by the user
-- ============================================================
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null,
  name text,
  last_scanned_at timestamptz,
  latest_score integer,
  created_at timestamptz not null default now()
);

create index if not exists sites_user_id_idx on public.sites (user_id);

alter table public.sites enable row level security;

create policy "sites_select_own" on public.sites
  for select using (auth.uid() = user_id);
create policy "sites_insert_own" on public.sites
  for insert with check (auth.uid() = user_id);
create policy "sites_update_own" on public.sites
  for update using (auth.uid() = user_id);
create policy "sites_delete_own" on public.sites
  for delete using (auth.uid() = user_id);

-- ============================================================
-- audits: an analysis run performed for a site
-- ============================================================
create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  overall_score integer not null,
  category_scores jsonb not null default '{}'::jsonb,
  raw_features jsonb not null default '{}'::jsonb,
  summary text,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists audits_site_id_idx on public.audits (site_id);

alter table public.audits enable row level security;

create policy "audits_select_own" on public.audits
  for select using (
    exists (select 1 from public.sites s where s.id = audits.site_id and s.user_id = auth.uid())
  );
create policy "audits_insert_own" on public.audits
  for insert with check (
    exists (select 1 from public.sites s where s.id = audits.site_id and s.user_id = auth.uid())
  );
create policy "audits_delete_own" on public.audits
  for delete using (
    exists (select 1 from public.sites s where s.id = audits.site_id and s.user_id = auth.uid())
  );

-- ============================================================
-- improvements: individual issues produced by an audit (Improvements UI)
-- ============================================================
create table if not exists public.improvements (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  site_id uuid not null references public.sites (id) on delete cascade,
  category text not null,
  severity text not null check (severity in ('high', 'medium', 'low')),
  title text not null,
  description text,
  code_location text,
  current_code text,
  suggested_code text,
  status text not null default 'open' check (status in ('open', 'fixed', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists improvements_site_id_idx on public.improvements (site_id);
create index if not exists improvements_audit_id_idx on public.improvements (audit_id);

alter table public.improvements enable row level security;

create policy "improvements_select_own" on public.improvements
  for select using (
    exists (select 1 from public.sites s where s.id = improvements.site_id and s.user_id = auth.uid())
  );
create policy "improvements_insert_own" on public.improvements
  for insert with check (
    exists (select 1 from public.sites s where s.id = improvements.site_id and s.user_id = auth.uid())
  );
create policy "improvements_update_own" on public.improvements
  for update using (
    exists (select 1 from public.sites s where s.id = improvements.site_id and s.user_id = auth.uid())
  );
create policy "improvements_delete_own" on public.improvements
  for delete using (
    exists (select 1 from public.sites s where s.id = improvements.site_id and s.user_id = auth.uid())
  );

-- ============================================================
-- PHASE 2 — schema skeleton (population logic deferred to later)
-- AI visibility tracking + sales conversion attribution.
-- ============================================================
create table if not exists public.visibility_queries (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  query_text text not null,
  engine text,
  created_at timestamptz not null default now()
);
alter table public.visibility_queries enable row level security;
create policy "vq_select_own" on public.visibility_queries
  for select using (
    exists (select 1 from public.sites s where s.id = visibility_queries.site_id and s.user_id = auth.uid())
  );

create table if not exists public.visibility_results (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  query_id uuid references public.visibility_queries (id) on delete cascade,
  engine text,
  appeared boolean,
  rank integer,
  snippet text,
  checked_at timestamptz not null default now()
);
alter table public.visibility_results enable row level security;
create policy "vr_select_own" on public.visibility_results
  for select using (
    exists (select 1 from public.sites s where s.id = visibility_results.site_id and s.user_id = auth.uid())
  );

create table if not exists public.conversions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  source text,
  referrer text,
  value numeric,
  occurred_at timestamptz not null default now()
);
alter table public.conversions enable row level security;
create policy "conv_select_own" on public.conversions
  for select using (
    exists (select 1 from public.sites s where s.id = conversions.site_id and s.user_id = auth.uid())
  );

-- ============================================================
-- Table-level permissions (REQUIRED in addition to RLS)
-- authenticated = signed-in user; anon = not signed in.
-- ============================================================
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  public.profiles,
  public.sites,
  public.audits,
  public.improvements,
  public.visibility_queries,
  public.visibility_results,
  public.conversions
to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
