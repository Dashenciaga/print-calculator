-- ═══════════════════════════════════════════════════════════════════════════
--  PrintCalc Pro — төлбөр (гараар батлах), үнийн санал, аюулгүй байдал
--  Supabase → SQL Editor → энэ файлыг бүхэлд нь хуулж → Run
--  Дахин ажиллуулахад аюулгүй (idempotent).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. subscriptions: хэрэглэгч ӨӨРӨӨ Pro болж чадахгүй ─────────────────────
create table if not exists public.subscriptions (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  plan       text not null default 'free',
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists subscriptions_user_id_uidx on public.subscriptions(user_id);

-- Өмнөх бүх policy-г устгана (хэрэглэгч өөрийн мөрөө засдаг байсан бол хаагдана)
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'public' and tablename = 'subscriptions' loop
    execute format('drop policy %I on public.subscriptions', p.policyname);
  end loop;
end $$;

alter table public.subscriptions enable row level security;

-- Зөвхөн өөрийнхөө эрхийг УНШИНА. Бичих эрх хэнд ч байхгүй — зөвхөн сервер (service role).
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated using (user_id = auth.uid());


-- ─── 2. payment_requests: данс руу шилжүүлсэн төлбөрийн хүсэлт ───────────────
create table if not exists public.payment_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text,
  ref_code    text not null unique,                 -- гүйлгээний утгад бичих код: PC-7F3K9Q
  amount      integer not null check (amount > 0),
  months      integer not null default 12 check (months between 1 and 60),
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected')),
  note        text,
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

-- Нэг хэрэглэгч нэг л хүлээгдэж буй хүсэлттэй байна
create unique index if not exists payment_requests_one_pending
  on public.payment_requests(user_id) where status = 'pending';
create index if not exists payment_requests_status_idx
  on public.payment_requests(status, created_at desc);

alter table public.payment_requests enable row level security;
drop policy if exists "payment_requests_select_own" on public.payment_requests;
create policy "payment_requests_select_own" on public.payment_requests
  for select to authenticated using (user_id = auth.uid());


-- ─── 3. quotes: үнийн санал, давхцахгүй дугаар ──────────────────────────────
create sequence if not exists public.quote_number_seq;

create table if not exists public.quotes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  number         text not null unique
                 default ('QT-' || lpad(nextval('public.quote_number_seq')::text, 6, '0')),
  client_name    text,
  client_contact text,
  product        text,
  qty            integer,
  total          bigint,
  vat_total      bigint,
  data           jsonb,
  sent_to        text,
  sent_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists quotes_user_idx on public.quotes(user_id, created_at desc);

alter table public.quotes enable row level security;
drop policy if exists "quotes_select_own" on public.quotes;
create policy "quotes_select_own" on public.quotes
  for select to authenticated using (user_id = auth.uid());


-- ─── 4. quote_emails: илгээсэн и-мэйлийн бүртгэл (өдрийн хязгаарт) ────────────
create table if not exists public.quote_emails (
  id         uuid primary key default gen_random_uuid(),
  quote_id   uuid not null references public.quotes(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  to_email   text not null,
  created_at timestamptz not null default now()
);
create index if not exists quote_emails_user_idx on public.quote_emails(user_id, created_at desc);

alter table public.quote_emails enable row level security;
drop policy if exists "quote_emails_select_own" on public.quote_emails;
create policy "quote_emails_select_own" on public.quote_emails
  for select to authenticated using (user_id = auth.uid());

-- payment_requests, quotes, quote_emails-д хэрэглэгч шууд БИЧИХ policy байхгүй:
-- бүх бичилт серверийн API-аар (Pro эрх, хязгаарыг шалгаад) хийгдэнэ.
