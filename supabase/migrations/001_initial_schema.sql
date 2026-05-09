-- Recreate public schema (dropped by drop schema public cascade)
create schema if not exists public;

-- Restore default Supabase grants (needed after drop schema public cascade)
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all   on schema public to postgres, service_role;

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── Profiles ───────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  locale       text not null default 'en',
  created_at   timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
create policy "Users can view their own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- ─── Events ──────────────────────────────────────────────────────────────────
create table public.events (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  slug       text        not null unique,
  status     text        not null default 'active'
               check (status in ('active', 'upcoming', 'closed')),
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;
create policy "Anyone can view events"
  on public.events for select using (true);

insert into public.events (name, slug, status, starts_at, ends_at)
values ('World Cup 2026', 'wc2026', 'active', '2026-06-11', '2026-07-19');

-- ─── Groups ─────────────────────────────────────────────────────────────────
create table public.groups (
  id               uuid        primary key default gen_random_uuid(),
  name             text        not null,
  creator_id       uuid        not null references auth.users(id) on delete cascade,
  invite_code      text        not null unique,
  max_participants int         not null default 50,
  event_id         uuid        references public.events(id),
  phase1_locked    boolean     not null default false,
  phase1_deadline  timestamptz,
  phase2_locked    boolean     not null default false,
  phase2_deadline  timestamptz,
  phase3_locked    boolean     not null default false,
  phase3_deadline  timestamptz,
  created_at       timestamptz not null default now()
);

alter table public.groups enable row level security;

-- ─── Group Members ───────────────────────────────────────────────────────────
create table public.group_members (
  id        uuid        primary key default gen_random_uuid(),
  group_id  uuid        not null references public.groups(id) on delete cascade,
  user_id   uuid        not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

alter table public.group_members enable row level security;

-- ─── Helper functions (must be defined before policies that use them) ────────
-- Both use security definer to bypass RLS and avoid infinite recursion

create or replace function public.get_my_group_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select group_id from group_members where user_id = auth.uid()
$$;

create or replace function public.can_join_group(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select (
    select count(*) from group_members where group_id = p_group_id
  ) < (
    select max_participants from groups where id = p_group_id
  )
$$;

-- ─── Groups policies ─────────────────────────────────────────────────────────
create policy "Members can view their groups"
  on public.groups for select
  using (
    id in (select public.get_my_group_ids())
    or creator_id = auth.uid()
  );

create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.uid() = creator_id);

create policy "Creator can update group"
  on public.groups for update
  using (creator_id = auth.uid());

-- ─── Group Members policies ───────────────────────────────────────────────────
create policy "Members can view group_members"
  on public.group_members for select
  using (
    group_id in (select public.get_my_group_ids())
  );

create policy "Users can join groups"
  on public.group_members for insert
  with check (
    auth.uid() = user_id
    and public.can_join_group(group_id)
  );

create policy "Users can leave groups"
  on public.group_members for delete
  using (user_id = auth.uid());

-- ─── WC Teams ────────────────────────────────────────────────────────────────
create table public.wc_teams (
  id             uuid    primary key default gen_random_uuid(),
  name           text    not null unique,
  group_letter   char(1) not null,
  external_id    int,
  is_best_third  boolean not null default false
);

alter table public.wc_teams enable row level security;
create policy "Anyone can view wc_teams"
  on public.wc_teams for select using (true);

-- ─── WC Matches ──────────────────────────────────────────────────────────────
create table public.wc_matches (
  id           uuid        primary key default gen_random_uuid(),
  external_id  int         not null unique,
  round        text        not null,
  home_team_id uuid        references public.wc_teams(id),
  away_team_id uuid        references public.wc_teams(id),
  home_score   int,
  away_score   int,
  status       text        not null default 'scheduled',
  kickoff_at   timestamptz not null
);

alter table public.wc_matches enable row level security;
create policy "Anyone can view wc_matches"
  on public.wc_matches for select using (true);

-- ─── Group Picks (rank 1st / 2nd / 3rd per WC group) ────────────────────────
create table public.group_picks (
  id         uuid        primary key default gen_random_uuid(),
  group_id   uuid        not null references public.groups(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  wc_group   char(1)     not null,
  rank1_id   uuid        not null references public.wc_teams(id),
  rank2_id   uuid        not null references public.wc_teams(id),
  rank3_id   uuid        references public.wc_teams(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_id, user_id, wc_group)
);

alter table public.group_picks enable row level security;

create policy "Members can view picks in their groups"
  on public.group_picks for select
  using (group_id in (select public.get_my_group_ids()));

create policy "Users can insert own picks"
  on public.group_picks for insert
  with check (
    auth.uid() = user_id
    and group_id in (select public.get_my_group_ids())
    and not exists (
      select 1 from public.groups
      where groups.id = group_picks.group_id
        and groups.phase1_locked = true
    )
  );

create policy "Users can update own picks"
  on public.group_picks for update
  using (
    auth.uid() = user_id
    and not exists (
      select 1 from public.groups
      where groups.id = group_picks.group_id
        and groups.phase1_locked = true
    )
  )
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.groups
      where groups.id = group_picks.group_id
        and groups.phase1_locked = true
    )
  );

-- ─── Best Third-Place Picks ───────────────────────────────────────────────────
create table public.best_third_picks (
  id         uuid        primary key default gen_random_uuid(),
  group_id   uuid        not null references public.groups(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  team_ids   uuid[]      not null default '{}',
  updated_at timestamptz not null default now(),
  unique(group_id, user_id)
);

alter table public.best_third_picks enable row level security;

create policy "Members can view best_third_picks in their groups"
  on public.best_third_picks for select
  using (group_id in (select public.get_my_group_ids()));

create policy "Users can insert own best_third_picks"
  on public.best_third_picks for insert
  with check (
    auth.uid() = user_id
    and group_id in (select public.get_my_group_ids())
    and not exists (
      select 1 from public.groups
      where groups.id = best_third_picks.group_id
        and groups.phase2_locked = true
    )
  );

create policy "Users can update own best_third_picks"
  on public.best_third_picks for update
  using (
    auth.uid() = user_id
    and not exists (
      select 1 from public.groups
      where groups.id = best_third_picks.group_id
        and groups.phase2_locked = true
    )
  )
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.groups
      where groups.id = best_third_picks.group_id
        and groups.phase2_locked = true
    )
  );

-- ─── Official Group Stage Results ────────────────────────────────────────────
create table public.wc_group_results (
  id         uuid        primary key default gen_random_uuid(),
  wc_group   char(1)     not null unique,
  rank1_id   uuid        references public.wc_teams(id),
  rank2_id   uuid        references public.wc_teams(id),
  rank3_id   uuid        references public.wc_teams(id),
  updated_at timestamptz not null default now()
);

alter table public.wc_group_results enable row level security;
create policy "Anyone can view wc_group_results"
  on public.wc_group_results for select using (true);

-- ─── Knockout Picks ──────────────────────────────────────────────────────────
create table public.knockout_picks (
  id         uuid        primary key default gen_random_uuid(),
  group_id   uuid        not null references public.groups(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  match_id   uuid        not null references public.wc_matches(id) on delete cascade,
  winner_id  uuid        not null references public.wc_teams(id),
  updated_at timestamptz not null default now(),
  unique(group_id, user_id, match_id)
);

alter table public.knockout_picks enable row level security;

create policy "Members can view knockout_picks in their groups"
  on public.knockout_picks for select
  using (group_id in (select public.get_my_group_ids()));

create policy "Users can insert own knockout_picks"
  on public.knockout_picks for insert
  with check (
    auth.uid() = user_id
    and group_id in (select public.get_my_group_ids())
    and not exists (
      select 1 from public.groups
      where groups.id = knockout_picks.group_id
        and groups.phase2_locked = true
    )
  );

create policy "Users can update own knockout_picks"
  on public.knockout_picks for update
  using (
    auth.uid() = user_id
    and not exists (
      select 1 from public.groups
      where groups.id = knockout_picks.group_id
        and groups.phase2_locked = true
    )
  )
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.groups
      where groups.id = knockout_picks.group_id
        and groups.phase2_locked = true
    )
  );

-- ─── Finals Picks ────────────────────────────────────────────────────────────
create table public.finals_picks (
  id           uuid        primary key default gen_random_uuid(),
  group_id     uuid        not null references public.groups(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  winner_id    uuid        references public.wc_teams(id),
  runner_up_id uuid        references public.wc_teams(id),
  third_id     uuid        references public.wc_teams(id),
  updated_at   timestamptz not null default now(),
  unique(group_id, user_id)
);

alter table public.finals_picks enable row level security;

create policy "Members can view finals_picks in their groups"
  on public.finals_picks for select
  using (group_id in (select public.get_my_group_ids()));

create policy "Users can insert own finals_picks"
  on public.finals_picks for insert
  with check (
    auth.uid() = user_id
    and group_id in (select public.get_my_group_ids())
    and not exists (
      select 1 from public.groups
      where groups.id = finals_picks.group_id
        and groups.phase3_locked = true
    )
  );

create policy "Users can update own finals_picks"
  on public.finals_picks for update
  using (
    auth.uid() = user_id
    and not exists (
      select 1 from public.groups
      where groups.id = finals_picks.group_id
        and groups.phase3_locked = true
    )
  )
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.groups
      where groups.id = finals_picks.group_id
        and groups.phase3_locked = true
    )
  );

-- ─── Bonus Questions ─────────────────────────────────────────────────────────
create table public.bonus_questions (
  id             uuid        primary key default gen_random_uuid(),
  group_id       uuid        not null references public.groups(id) on delete cascade,
  question       text        not null,
  type           text        not null check (type in ('choice', 'number', 'text')),
  options        jsonb,
  difficulty     text        not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  correct_answer text,
  created_at     timestamptz not null default now()
);

alter table public.bonus_questions enable row level security;

create policy "Members can view bonus_questions in their groups"
  on public.bonus_questions for select
  using (group_id in (select public.get_my_group_ids()));

create policy "Creator can manage bonus_questions"
  on public.bonus_questions for all
  using (group_id in (select id from public.groups where creator_id = auth.uid()));

-- ─── Bonus Answers ───────────────────────────────────────────────────────────
create table public.bonus_answers (
  id          uuid        primary key default gen_random_uuid(),
  question_id uuid        not null references public.bonus_questions(id) on delete cascade,
  group_id    uuid        not null references public.groups(id) on delete cascade,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  answer      text        not null,
  created_at  timestamptz not null default now(),
  unique(question_id, user_id)
);

alter table public.bonus_answers enable row level security;

create policy "Members can view bonus_answers in their groups"
  on public.bonus_answers for select
  using (group_id in (select public.get_my_group_ids()));

create policy "Users can insert own bonus_answers"
  on public.bonus_answers for insert
  with check (auth.uid() = user_id and group_id in (select public.get_my_group_ids()));

create policy "Users can update own bonus_answers"
  on public.bonus_answers for update
  using (auth.uid() = user_id);

-- ─── Feedback ────────────────────────────────────────────────────────────────
create table public.feedback (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users(id) on delete set null,
  message    text        not null,
  page       text,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;
create policy "Anyone can insert feedback"
  on public.feedback for insert with check (true);

-- Grant table-level access to Supabase roles (RLS policies control row-level access)
grant all                             on all tables    in schema public to service_role;
grant all                             on all sequences in schema public to service_role;
grant select, insert, update, delete  on all tables    in schema public to authenticated;
grant select                          on all tables    in schema public to anon;
grant usage, select                   on all sequences in schema public to authenticated;
grant execute                         on all functions in schema public to authenticated, anon, service_role;
