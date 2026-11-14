-- ═══════════════════════════════════════════════════════════════════════════
--  PrintCalc Pro — үндсэн хүснэгтүүд (profiles, calculations, feedbacks, лого)
--  Шинэ Supabase төсөл дээр ЭХЭНД энэ файлыг, дараа нь 20261111_billing.sql-ийг
--  ажиллуулна. Дахин ажиллуулахад аюулгүй (idempotent).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. profiles: компанийн мэдээлэл ────────────────────────────────────────
create table if not exists public.profiles (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references auth.users(id) on delete cascade,
  email              text,
  company_name       text,
  phone              text,
  address            text,
  website            text,
  contact_name       text,
  contact_email      text,
  register_number    text,
  bank_name          text,
  bank_account       text,
  default_vat        numeric not null default 10,
  default_overhead   numeric not null default 15,
  default_print_cost numeric not null default 80,
  logo_url           text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));


-- ─── 2. calculations: хадгалсан тооцоо ──────────────────────────────────────
create table if not exists public.calculations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text,
  paper_size  text,
  paper_w     numeric,
  paper_h     numeric,
  material_w  numeric,
  material_h  numeric,
  qty         integer,
  total       bigint,
  per_sheet   integer,
  efficiency  integer,
  created_at  timestamptz not null default now()
);
create index if not exists calculations_user_idx on public.calculations(user_id, created_at desc);

alter table public.calculations enable row level security;

drop policy if exists "calculations_select_own" on public.calculations;
create policy "calculations_select_own" on public.calculations
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "calculations_insert_own" on public.calculations;
create policy "calculations_insert_own" on public.calculations
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "calculations_delete_own" on public.calculations;
create policy "calculations_delete_own" on public.calculations
  for delete to authenticated using (user_id = (select auth.uid()));


-- ─── 3. feedbacks: санал хүсэлт (зөвхөн админ серверээр уншина) ─────────────
create table if not exists public.feedbacks (
  id           bigint generated always as identity primary key,
  user_id      uuid references auth.users(id) on delete set null,
  email        text,
  company_name text,
  message      text not null check (char_length(message) between 1 and 4000),
  rating       integer check (rating between 1 and 5),
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists feedbacks_created_idx on public.feedbacks(created_at desc);
create index if not exists feedbacks_user_idx on public.feedbacks(user_id);

alter table public.feedbacks enable row level security;

-- Нэвтэрсэн хэрэглэгч зөвхөн өөрийн нэрээр илгээнэ. Унших policy байхгүй.
drop policy if exists "feedbacks_insert_own" on public.feedbacks;
create policy "feedbacks_insert_own" on public.feedbacks
  for insert to authenticated with check (user_id = (select auth.uid()));


-- ─── 4. logos: компанийн лого (Storage) ─────────────────────────────────────
-- Нийтэд нээлттэй bucket: логог үнийн санал дээр шууд холбоосоор харуулна.
-- Хэрэглэгч зөвхөн <өөрийн id>/... хавтсанд бичнэ. upsert хийхэд select,
-- insert, update гурвуулаа хэрэгтэй (өмнөх 400 алдааны шалтгаан).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "logos_select_own" on storage.objects;
create policy "logos_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "logos_insert_own" on storage.objects;
create policy "logos_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "logos_update_own" on storage.objects;
create policy "logos_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "logos_delete_own" on storage.objects;
create policy "logos_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
