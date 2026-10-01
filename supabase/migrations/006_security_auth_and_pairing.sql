-- Teammate 1: reconcile legacy rows and enforce access at the database boundary.
begin;

alter table public.sessions alter column created_by drop not null;
alter table public.sessions add column if not exists bed_label text;
alter table public.sessions add column if not exists requested_at timestamptz;
update public.sessions s set requested_at = coalesce((
  select max(e.created_at) from public.session_events e
  where e.session_id = s.id and e.event_type = 'interpreter_requested'
), s.created_at) where s.status = 'interpreter_requested' and s.requested_at is null;
update public.sessions set bed_label = lower(regexp_replace(trim(
  coalesce(nullif(split_part(patient_display_name, ' - ', 1), ''), 'bed ' || id::text)
), '\s+', ' ', 'g')) where bed_label is null;
alter table public.sessions alter column bed_label set not null;
alter table public.sessions add constraint sessions_normalized_bed_label
  check (bed_label <> '' and bed_label = lower(regexp_replace(trim(bed_label), '\s+', ' ', 'g')));
-- Close older duplicate beds before enforcing uniqueness; preserve every audit row.
with ranked as (
  select id, row_number() over (partition by hospital_id, bed_label order by created_at desc, id) as position
  from public.sessions where status <> 'closed'
)
update public.sessions set status = 'closed', closed_at = now()
where id in (select id from ranked where position > 1);
create unique index sessions_active_bed on public.sessions(hospital_id, bed_label) where status <> 'closed';

create or replace function public.get_auth_role() returns text
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid(); $$;
create or replace function public.is_hospital_staff() returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.get_auth_role() in ('doctor', 'hospital_staff', 'hospital_admin'), false); $$;
revoke all on function public.get_auth_role(), public.is_hospital_staff() from public;
grant execute on function public.get_auth_role(), public.is_hospital_staff() to authenticated;

-- A user's editable profile must never be an avenue to change authorization.
revoke update on public.profiles from authenticated, anon;
grant update(full_name) on public.profiles to authenticated;

drop policy if exists "Hospital staff can read hospital profiles" on public.profiles;
create policy "Hospital staff can read hospital profiles" on public.profiles for select to authenticated
  using (public.is_hospital_staff() and hospital_id = public.get_auth_hospital_id());
drop policy if exists "Hospital users can read their sessions" on public.sessions;
create policy "Hospital users can read their sessions" on public.sessions for select to authenticated
  using (public.is_hospital_staff() and hospital_id = public.get_auth_hospital_id());
drop policy if exists "Hospital users can create sessions" on public.sessions;
create policy "Hospital users can create sessions" on public.sessions for insert to authenticated
  with check (public.is_hospital_staff() and hospital_id = public.get_auth_hospital_id() and created_by = auth.uid());
drop policy if exists "Hospital users can update their sessions" on public.sessions;
create policy "Hospital users can update their sessions" on public.sessions for update to authenticated
  using (public.is_hospital_staff() and hospital_id = public.get_auth_hospital_id())
  with check (public.is_hospital_staff() and hospital_id = public.get_auth_hospital_id());
drop policy if exists "Interpreter can read assigned session" on public.sessions;
create policy "Interpreter can read assigned session" on public.sessions for select to authenticated
  using (public.get_auth_role() = 'interpreter' and assigned_interpreter_id = auth.uid());
drop policy if exists "Interpreter can update assigned session" on public.sessions;
-- Interpreters change status through a constrained RPC rather than unrestricted table updates.

-- Required by the new session authorization: an interpreter must be assigned before joining video.
create or replace function public.claim_session(session_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if public.get_auth_role() is distinct from 'interpreter' then
    raise exception 'Interpreter access required' using errcode = '42501';
  end if;
  update public.sessions set assigned_interpreter_id = auth.uid(),
    status = 'interpreter_connected', active_mode = 'live_interpreter'
  where id = session_id and status = 'interpreter_requested' and assigned_interpreter_id is null;
  return found;
end; $$;
revoke all on function public.claim_session(uuid) from public, anon;
grant execute on function public.claim_session(uuid) to authenticated;

create or replace function public.set_interpreter_session_status(target_id uuid, new_status text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if public.get_auth_role() is distinct from 'interpreter' or new_status not in ('active', 'interpreter_connected') then
    raise exception 'Interpreter access required' using errcode = '42501';
  end if;
  update public.sessions set status = new_status,
    active_mode = case when new_status = 'active' then 'pictogram' else 'live_interpreter' end,
    assigned_interpreter_id = case when new_status = 'active' then null else auth.uid() end
  where id = target_id and assigned_interpreter_id = auth.uid() and status <> 'closed';
  return found;
end; $$;
revoke all on function public.set_interpreter_session_status(uuid, text) from public, anon;
grant execute on function public.set_interpreter_session_status(uuid, text) to authenticated;

drop policy if exists "Hospital users can read session events" on public.session_events;
create policy "Hospital users can read session events" on public.session_events for select to authenticated
  using (public.is_hospital_staff() and exists (
    select 1 from public.sessions s where s.id = session_id and s.hospital_id = public.get_auth_hospital_id()
  ));
drop policy if exists "Authenticated users can log events" on public.session_events;
create policy "Authorized users can log events" on public.session_events for insert to authenticated
  with check (actor_id = auth.uid() and exists (
    select 1 from public.sessions s where s.id = session_id and s.status <> 'closed' and (
      (public.is_hospital_staff() and s.hospital_id = public.get_auth_hospital_id()) or
      (public.get_auth_role() = 'interpreter' and s.assigned_interpreter_id = auth.uid())
    )
  ));

create or replace function public.reject_audit_mutation() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception 'Session events are append-only' using errcode = '42501';
end; $$;
create trigger session_events_append_only before update or delete on public.session_events
  for each row execute function public.reject_audit_mutation();
create trigger session_events_no_truncate before truncate on public.session_events
  for each statement execute function public.reject_audit_mutation();
revoke update, delete, truncate on public.session_events from anon, authenticated, service_role;

create table public.kiosk_pairings (
  secret_hash text primary key check (secret_hash ~ '^[a-f0-9]{64}$'),
  session_id uuid not null references public.sessions(id),
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.kiosk_tokens (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  session_id uuid not null references public.sessions(id),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.kiosk_pairings enable row level security;
alter table public.kiosk_tokens enable row level security;
revoke all on public.kiosk_tokens from anon, authenticated;
revoke all on public.kiosk_pairings from anon, authenticated;
grant insert on public.kiosk_pairings to authenticated;
create policy "Staff may create pairing secrets" on public.kiosk_pairings for insert to authenticated
  with check (created_by = auth.uid() and public.is_hospital_staff()
    and expires_at > now() and expires_at <= now() + interval '5 minutes' and exists (
    select 1 from public.sessions s where s.id = session_id
    and s.hospital_id = public.get_auth_hospital_id() and s.status <> 'closed'
  ));

-- One transaction consumes the secret and creates a kiosk grant. Concurrent scans cannot both succeed.
create or replace function public.consume_kiosk_pairing(pairing_hash text, kiosk_hash text)
returns uuid language plpgsql security definer set search_path = public as $$
declare paired_session uuid;
begin
  select p.session_id into paired_session from public.kiosk_pairings p
    join public.sessions s on s.id = p.session_id
    where p.secret_hash = pairing_hash and p.consumed_at is null
      and p.expires_at > now() and s.status <> 'closed'
    for update of p, s;
  if paired_session is null then return null; end if;
  update public.kiosk_pairings set consumed_at = now() where secret_hash = pairing_hash;
  insert into public.kiosk_tokens(token_hash, session_id, expires_at)
    values(kiosk_hash, paired_session, now() + interval '12 hours');
  return paired_session;
end; $$;
revoke all on function public.consume_kiosk_pairing(text, text) from public, anon, authenticated;
grant execute on function public.consume_kiosk_pairing(text, text) to service_role;

create or replace function public.revoke_closed_session_kiosks() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'closed' and old.status <> 'closed' then
    update public.kiosk_tokens set revoked_at = now() where session_id = new.id and revoked_at is null;
    update public.kiosk_pairings set consumed_at = now() where session_id = new.id and consumed_at is null;
  end if;
  return new;
end; $$;
create trigger revoke_kiosks_on_close after update of status on public.sessions
  for each row execute function public.revoke_closed_session_kiosks();

-- ISL storage reads use the authenticated RLS client, never a service-role signing endpoint.
create policy "Staff may read ISL videos" on storage.objects for select to authenticated
  using (bucket_id = 'isl-clips' and public.is_hospital_staff());
commit;
