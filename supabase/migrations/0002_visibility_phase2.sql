-- Faz 2: AI görünürlük takibi için şema genişletme

-- Marka adı (boşsa hostname'den türetilir).
alter table public.sites add column if not exists brand text;

-- Sonuçlara rakip listesi + ham cevap + soru metni (kolay sorgu için denormalize).
alter table public.visibility_results
  add column if not exists competitors jsonb not null default '[]'::jsonb,
  add column if not exists raw_answer text,
  add column if not exists query_text text;

-- visibility_queries: insert/delete (kullanıcı kendi sitesi için soru üretir/siler).
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
