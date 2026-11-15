-- ═══════════════════════════════════════════════════════════════════════════
--  PrintCalc Pro — компанийн үнийн тохиргоо
--  Цаас, төмөр, даралт, хадаас, нугалаа, боловсруулалтын анхны үнийг компани
--  нэг удаа оруулж хадгална, үнэ өөрчлөгдөхөд засна. Дахин ажиллуулахад аюулгүй.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.price_settings (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb
             check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 32768),
  updated_at timestamptz not null default now()
);

alter table public.price_settings enable row level security;

drop policy if exists "price_settings_select_own" on public.price_settings;
create policy "price_settings_select_own" on public.price_settings
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "price_settings_insert_own" on public.price_settings;
create policy "price_settings_insert_own" on public.price_settings
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "price_settings_update_own" on public.price_settings;
create policy "price_settings_update_own" on public.price_settings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
