alter table public.groups
  add column mode text not null default 'simple'
    check (mode in ('simple', 'advanced'));

create table public.match_predictions (
  id          uuid        primary key default gen_random_uuid(),
  group_id    uuid        not null references public.groups(id) on delete cascade,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  match_id    uuid        not null references public.wc_matches(id) on delete cascade,
  prediction  text        not null check (prediction in ('home', 'draw', 'away')),
  created_at  timestamptz not null default now(),
  unique(group_id, user_id, match_id)
);

alter table public.match_predictions enable row level security;

create policy "Members can view match predictions in their groups"
  on public.match_predictions for select
  using (group_id in (select public.get_my_group_ids()));

create policy "Members can insert match predictions when phase1 unlocked"
  on public.match_predictions for insert
  with check (
    group_id in (select public.get_my_group_ids())
    and not (select phase1_locked from public.groups where id = group_id)
  );

create policy "Members can update their own match predictions when phase1 unlocked"
  on public.match_predictions for update
  using (user_id = auth.uid())
  with check (
    not (select phase1_locked from public.groups where id = group_id)
  );
