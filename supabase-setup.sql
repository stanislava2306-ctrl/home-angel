-- Домашний ангел · Supabase Setup
-- Выполни этот SQL в Supabase Dashboard → SQL Editor

-- ── Таблица заявок с сайта ──────────────────────────────
create table if not exists leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null,
  email       text,
  interest    text,
  comment     text,
  source      text default 'website',
  status      text default 'new',   -- new | contacted | converted | closed
  created_at  timestamptz default now()
);

-- Индекс для быстрой сортировки по дате
create index if not exists leads_created_at_idx on leads (created_at desc);

-- Разрешаем вставку анонимным пользователям (с сайта)
alter table leads enable row level security;

create policy "Anyone can insert a lead"
  on leads for insert
  to anon
  with check (true);

-- Только авторизованные могут читать (для CRM-панели)
create policy "Authenticated can view leads"
  on leads for select
  to authenticated
  using (true);

create policy "Authenticated can update leads"
  on leads for update
  to authenticated
  using (true);


-- ── Таблица профилей из онбординга ──────────────────────
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  user_name       text,
  elder_name      text,
  elder_age       int,
  elder_address   text,
  conditions      text[],   -- массив заболеваний
  wake_time       text,
  sleep_time      text,
  walk_freq       text,
  health_notes    text,
  onboarding_done boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users manage own profile"
  on profiles for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- ── Таблица событий от устройств (для будущей интеграции) ─
create table if not exists device_events (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references profiles(id) on delete cascade,
  device_type text,   -- gps_watch | motion | door | gas | water
  event_type  text,   -- motion | sos | fall | open | close | leak | low_battery
  severity    text default 'info',  -- info | warning | critical
  payload     jsonb,  -- дополнительные данные
  created_at  timestamptz default now()
);

create index if not exists events_profile_created on device_events (profile_id, created_at desc);

alter table device_events enable row level security;

create policy "Users see own events"
  on device_events for select
  to authenticated
  using (profile_id in (select id from profiles where id = auth.uid()));

-- Сервисный ключ может вставлять события (для хаба)
create policy "Service can insert events"
  on device_events for insert
  to service_role
  with check (true);
