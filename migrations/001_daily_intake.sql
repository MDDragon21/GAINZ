-- GAINZ — Intake-Tracking (Kreatin, Protein, Supplements)
--
-- REIN ADDITIV. Diese Migration legt eine neue Tabelle an und fügt eine
-- Spalte mit Default hinzu. Sie ändert, löscht oder leert KEINE bestehenden
-- Tabellen, Spalten oder Zeilen. Bestehende Trainings, Messungen, Streak,
-- Abzeichen und Logins bleiben unberührt.
--
-- Mehrfaches Ausführen ist ungefährlich (alles IF NOT EXISTS).

-- 1) Neue Tabelle: ein Datensatz pro Nutzer und Tag.
create table if not exists public.daily_intake (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  day         date not null,
  creatine    boolean not null default false,
  supplements boolean not null default false,
  protein_g   integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint daily_intake_user_day_key unique (user_id, day),
  constraint daily_intake_protein_range check (protein_g >= 0 and protein_g <= 1000)
);

create index if not exists daily_intake_user_day_idx
  on public.daily_intake (user_id, day desc);

-- 2) Row Level Security: jeder sieht und schreibt nur seine eigenen Zeilen.
alter table public.daily_intake enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'daily_intake'
      and policyname = 'daily_intake_select_own'
  ) then
    create policy daily_intake_select_own on public.daily_intake
      for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'daily_intake'
      and policyname = 'daily_intake_insert_own'
  ) then
    create policy daily_intake_insert_own on public.daily_intake
      for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'daily_intake'
      and policyname = 'daily_intake_update_own'
  ) then
    create policy daily_intake_update_own on public.daily_intake
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'daily_intake'
      and policyname = 'daily_intake_delete_own'
  ) then
    create policy daily_intake_delete_own on public.daily_intake
      for delete using (auth.uid() = user_id);
  end if;
end $$;

-- 3) Neue Profilspalte für das Protein-Tagesziel.
--    Bestehende Zeilen bekommen den Default 120, nichts wird überschrieben.
alter table public.profiles
  add column if not exists protein_goal_g integer default 120;

-- 4) Kontrolle: zeigt die neue Tabelle und die neue Spalte.
--    Erwartung: 1 Zeile für die Spalte, 4 Policies.
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'profiles'
       and column_name = 'protein_goal_g')            as profil_spalte,
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'daily_intake') as tabelle,
  (select count(*) from pg_policies
     where schemaname = 'public' and tablename = 'daily_intake')    as policies;
