-- Recover pending calls after a missed broadcast without exposing unassigned patient records.
create or replace function public.list_interpreter_requests()
returns table (session_id uuid, hospital_name text, bed_label text, requested_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.get_auth_role() is distinct from 'interpreter' then
    raise exception 'Interpreter access required' using errcode = '42501';
  end if;
  return query
    select s.id, h.name, s.bed_label, coalesce(s.requested_at, s.created_at)
    from public.sessions s join public.hospitals h on h.id = s.hospital_id
    where s.status = 'interpreter_requested' and s.assigned_interpreter_id is null
    order by coalesce(s.requested_at, s.created_at) asc, s.id
    limit 100;
end; $$;
revoke all on function public.list_interpreter_requests() from public, anon;
grant execute on function public.list_interpreter_requests() to authenticated;
