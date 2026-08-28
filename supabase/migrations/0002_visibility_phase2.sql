-- Phase 2: schema extension for AI visibility tracking

-- Brand name (derived from the hostname if empty).
alter table public.sites add column if not exists brand text;

-- Add competitor list + raw answer + query text to results (denormalized for easy querying).
alter table public.visibility_results
  add column if not exists competitors jsonb not null default '[]'::jsonb,
  add column if not exists raw_answer text,
  add column if not exists query_text text;

-- visibility_queries: insert/delete (user generates/deletes queries for their own site).
create policy "vq_insert_own" on public.visibility_queries
  for insert with check (
    exists (select 1 from public.sites s where s.id = visibility_queries.site_id and s.user_id = auth.uid())
  );
create policy "vq_delete_own" on public.visibility_queries
  for delete using (
    exists (select 1 from public.sites s where s.id = visibility_queries.site_id and s.user_id = auth.uid())
  );

-- visibility_results: insert/delete.
create policy "vr_insert_own" on public.visibility_results
  for insert with check (
    exists (select 1 from public.sites s where s.id = visibility_results.site_id and s.user_id = auth.uid())
  );
create policy "vr_delete_own" on public.visibility_results
  for delete using (
    exists (select 1 from public.sites s where s.id = visibility_results.site_id and s.user_id = auth.uid())
  );
