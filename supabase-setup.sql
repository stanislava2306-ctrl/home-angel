-- Домашний ангел · Supabase Setup
-- ВЫПОЛНИ В: Supabase Dashboard → SQL Editor → New query → Run

-- ── Таблица заявок с сайта ──
create table if not exists leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null,
  email       text,
  interest    text,
  comment     text,
  source      text default 'website',
  status      text default 'new',
  created_at  timestamptz default now()
);

-- Разрешаем вставку всем (форма на сайте работает без логина)
alter table leads enable row level security;

create policy "Anyone can insert a lead"
  on leads for insert
  to anon, authenticated
  with check (true);

create policy "Authenticated can view leads"
  on leads for select
  to authenticated
  using (true);
