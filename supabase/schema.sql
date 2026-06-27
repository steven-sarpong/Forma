-- FridgeAI / SmartMeal Tracker – Supabase-Schema (Phase 5: Auth & Cloud-Sync)
--
-- Ausführen im Supabase SQL-Editor (Projekt -> SQL Editor -> New query),
-- danach Projekt-URL und Anon-Key aus "Project Settings -> API" in
-- .env.local als NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY eintragen.
--
-- Diese Phase synchronisiert zunächst das Nutzerprofil (Onboarding-Daten,
-- Ziele) über Geräte hinweg. Kühlschrank, Mahlzeiten, Gewicht und Training
-- bleiben vorerst lokal (localStorage) und werden in einer Folge-Phase migriert.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  gender text not null,
  age integer not null,
  height_cm numeric not null,
  weight_kg numeric not null,
  target_weight_kg numeric not null,
  activity_level text not null,
  training_frequency integer not null default 0,
  body_fat_percent numeric,
  steps_per_day integer,
  occupation text,
  eating_habits text,
  allergies text[] not null default '{}',
  intolerances text[] not null default '{}',
  favorite_foods text[] not null default '{}',
  disliked_foods text[] not null default '{}',
  budget text,
  cooking_time text,
  goal text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Nutzer sehen nur ihr eigenes Profil"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Nutzer legen nur ihr eigenes Profil an"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Nutzer aktualisieren nur ihr eigenes Profil"
  on public.profiles for update
  using (auth.uid() = user_id);

create policy "Nutzer löschen nur ihr eigenes Profil"
  on public.profiles for delete
  using (auth.uid() = user_id);

-- Hält updated_at automatisch aktuell.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Phase 5b: Cloud-Sync für Kühlschrank, Mahlzeiten, Gewicht und Training.
-- IDs werden clientseitig erzeugt (uuid), damit die App offline-fähig bleibt
-- und beim ersten Login bestehende lokale Daten 1:1 übernehmen kann.
-- ---------------------------------------------------------------------------

create table if not exists public.fridge_items (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null,
  quantity text,
  quantity_value numeric,
  quantity_unit text,
  expiry_date text,
  confidence numeric,
  added_at timestamptz not null default now(),
  source text not null,
  nutrition_per_100g jsonb,
  nutrition_estimated boolean not null default false
);

alter table public.fridge_items enable row level security;

create policy "Nutzer verwalten nur eigene Kühlschrank-Items"
  on public.fridge_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists fridge_items_user_id_idx on public.fridge_items (user_id);

create table if not exists public.meals (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  calories numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  eaten_at timestamptz not null,
  source text not null,
  recipe_title text,
  confidence numeric,
  items jsonb,
  model_used text
);

alter table public.meals enable row level security;

create policy "Nutzer verwalten nur eigene Mahlzeiten"
  on public.meals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists meals_user_id_idx on public.meals (user_id);

create table if not exists public.weight_entries (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  weight_kg numeric not null,
  body_fat_percent numeric,
  note text,
  logged_at timestamptz not null
);

alter table public.weight_entries enable row level security;

create policy "Nutzer verwalten nur eigene Gewichtseinträge"
  on public.weight_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists weight_entries_user_id_idx on public.weight_entries (user_id);

-- Ein aktiver Trainingsplan pro Nutzer (user_id ist Primärschlüssel).
create table if not exists public.workout_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan_id uuid not null,
  goal text not null,
  days_per_week integer not null,
  days jsonb not null,
  model_used text,
  created_at timestamptz not null default now()
);

alter table public.workout_plans enable row level security;

create policy "Nutzer verwalten nur ihren eigenen Trainingsplan"
  on public.workout_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.workout_logs (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  day_name text not null,
  duration_minutes integer not null,
  calories_burned integer not null,
  completed_at timestamptz not null
);

alter table public.workout_logs enable row level security;

create policy "Nutzer verwalten nur eigene Trainingseinheiten"
  on public.workout_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists workout_logs_user_id_idx on public.workout_logs (user_id);

-- ---------------------------------------------------------------------------
-- Phase 6: Gamification (XP, Level, Streaks, Badges). Ein Stats-Datensatz
-- pro Nutzer, analog zu workout_plans per user_id als Primärschlüssel.
-- ---------------------------------------------------------------------------

create table if not exists public.user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_activity_date text,
  unlocked_badge_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.user_stats enable row level security;

create policy "Nutzer verwalten nur ihre eigenen Stats"
  on public.user_stats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger user_stats_set_updated_at
  before update on public.user_stats
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Phase 6c: Social – Freunde, Freundschaftsanfragen & Leaderboard.
-- ---------------------------------------------------------------------------

-- Sichtbarer Anzeigename für Social-Features (Freunde, Leaderboard).
alter table public.profiles add column if not exists display_name text;

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  constraint friendships_no_self_friend check (user_id <> friend_id),
  constraint friendships_unique_pair unique (user_id, friend_id)
);

alter table public.friendships enable row level security;

create policy "Nutzer sehen Freundschaften, an denen sie beteiligt sind"
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Nutzer senden Freundschaftsanfragen"
  on public.friendships for insert
  with check (auth.uid() = user_id);

create policy "Beteiligte aktualisieren Freundschaftsstatus"
  on public.friendships for update
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Beteiligte löschen Freundschaften"
  on public.friendships for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);

create index if not exists friendships_user_id_idx on public.friendships (user_id);
create index if not exists friendships_friend_id_idx on public.friendships (friend_id);

-- Erlaubt es, einen Nutzer per E-Mail zu finden (für Freundschaftsanfragen),
-- ohne der Anwendung direkten Lesezugriff auf auth.users zu geben.
create or replace function public.find_user_id_by_email(lookup_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from auth.users where email = lower(lookup_email) limit 1;
$$;

revoke all on function public.find_user_id_by_email(text) from public;
grant execute on function public.find_user_id_by_email(text) to authenticated;

-- Erweiterte Sichtbarkeit: akzeptierte Freunde dürfen Profil & Stats
-- gegenseitig sehen (für Anzeigename & Leaderboard).
-- "pending" eingeschlossen, damit eingehende Anfragen den Anzeigenamen des
-- Absenders zeigen können, bevor die Anfrage angenommen wurde.
create policy "Nutzer sehen Profile von Freunden (auch Anfragen)"
  on public.profiles for select
  using (
    user_id in (
      select friend_id from public.friendships where user_id = auth.uid()
      union
      select user_id from public.friendships where friend_id = auth.uid()
    )
  );

create policy "Nutzer sehen Stats akzeptierter Freunde"
  on public.user_stats for select
  using (
    user_id in (
      select friend_id from public.friendships where user_id = auth.uid() and status = 'accepted'
      union
      select user_id from public.friendships where friend_id = auth.uid() and status = 'accepted'
    )
  );

-- ---------------------------------------------------------------------------
-- Phase 6d: Gruppen-Challenges & Freundes-Aktivitäts-Feed.
-- ---------------------------------------------------------------------------

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  goal_type text not null default 'xp' check (goal_type in ('xp')),
  target_value integer not null check (target_value > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.challenges enable row level security;

create table if not exists public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined')),
  starting_xp integer not null default 0,
  joined_at timestamptz,
  constraint challenge_participants_unique unique (challenge_id, user_id)
);

alter table public.challenge_participants enable row level security;

-- SECURITY DEFINER, da eine direkte Subquery auf challenge_participants
-- innerhalb dessen eigener RLS-Policy zu "infinite recursion" führen würde.
create or replace function public.my_challenge_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select challenge_id from public.challenge_participants where user_id = auth.uid();
$$;

create policy "Teilnehmer sehen Challenges, an denen sie beteiligt sind"
  on public.challenges for select
  using (
    auth.uid() = creator_id
    or id in (select public.my_challenge_ids())
  );

create policy "Nutzer erstellen eigene Challenges"
  on public.challenges for insert
  with check (auth.uid() = creator_id);

create policy "Ersteller verwalten ihre Challenges"
  on public.challenges for update
  using (auth.uid() = creator_id);

create policy "Ersteller löschen ihre Challenges"
  on public.challenges for delete
  using (auth.uid() = creator_id);

create policy "Teilnehmer sehen Mitspieler derselben Challenge"
  on public.challenge_participants for select
  using (
    challenge_id in (select public.my_challenge_ids())
    or challenge_id in (select id from public.challenges where creator_id = auth.uid())
  );

create policy "Ersteller laden Teilnehmer ein"
  on public.challenge_participants for insert
  with check (
    exists (select 1 from public.challenges c where c.id = challenge_id and c.creator_id = auth.uid())
  );

create policy "Teilnehmer und Ersteller aktualisieren Teilnahme"
  on public.challenge_participants for update
  using (
    auth.uid() = user_id
    or exists (select 1 from public.challenges c where c.id = challenge_id and c.creator_id = auth.uid())
  );

create policy "Teilnehmer und Ersteller entfernen Teilnahme"
  on public.challenge_participants for delete
  using (
    auth.uid() = user_id
    or exists (select 1 from public.challenges c where c.id = challenge_id and c.creator_id = auth.uid())
  );

create index if not exists challenge_participants_challenge_idx on public.challenge_participants (challenge_id);
create index if not exists challenge_participants_user_idx on public.challenge_participants (user_id);

-- Profile & Stats von Mitspielern in gemeinsamen Challenges sichtbar machen
-- (auch wenn sie nicht direkt befreundet sind).
create policy "Nutzer sehen Profile von Mitspielern gemeinsamer Challenges"
  on public.profiles for select
  using (
    user_id in (
      select cp.user_id from public.challenge_participants cp
      where cp.challenge_id in (select public.my_challenge_ids())
    )
  );

create policy "Nutzer sehen Stats von Mitspielern gemeinsamer Challenges"
  on public.user_stats for select
  using (
    user_id in (
      select cp.user_id from public.challenge_participants cp
      where cp.challenge_id in (select public.my_challenge_ids())
    )
  );

create table if not exists public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('level_up', 'badge_unlock')),
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.activity_feed enable row level security;

create policy "Nutzer sehen eigene Aktivitäten und die ihrer Freunde"
  on public.activity_feed for select
  using (
    auth.uid() = user_id
    or user_id in (
      select friend_id from public.friendships where user_id = auth.uid() and status = 'accepted'
      union
      select user_id from public.friendships where friend_id = auth.uid() and status = 'accepted'
    )
  );

create policy "Nutzer posten nur eigene Aktivitäten"
  on public.activity_feed for insert
  with check (auth.uid() = user_id);

create index if not exists activity_feed_user_id_idx on public.activity_feed (user_id);
create index if not exists activity_feed_created_at_idx on public.activity_feed (created_at desc);
