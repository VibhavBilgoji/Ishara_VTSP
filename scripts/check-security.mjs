// Fresh PostgreSQL schema check. Supabase-owned auth/storage schemas and roles are bootstrapped locally.
import { PGlite } from '@electric-sql/pglite'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'

const db = new PGlite()
await db.exec(`
  create role anon;
  create role authenticated;
  create role service_role bypassrls;
  create schema auth;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text);
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
`)
const migrationDir = new URL('../supabase/migrations/', import.meta.url)
for (const file of (await readdir(migrationDir)).filter((file) => file.endsWith('.sql')).sort()) {
  await db.exec(await readFile(new URL(file, migrationDir), 'utf8'))
  console.log(`Applied ${file}`)
}

const hospitalA = 'a0000000-0000-0000-0000-000000000001'
const hospitalB = 'a0000000-0000-0000-0000-000000000002'
const staffA = '10000000-0000-0000-0000-000000000001'
const staffB = '10000000-0000-0000-0000-000000000002'
const interpreterA = '20000000-0000-0000-0000-000000000001'
const interpreterB = '20000000-0000-0000-0000-000000000002'
const sessionA = '30000000-0000-0000-0000-000000000001'
const sessionB = '30000000-0000-0000-0000-000000000002'
await db.exec(`
  insert into auth.users values ('${staffA}'), ('${staffB}'), ('${interpreterA}'), ('${interpreterB}');
  insert into public.hospitals(id, name) values ('${hospitalB}', 'Second hospital');
  insert into public.profiles(id, role, hospital_id) values
    ('${staffA}', 'doctor', '${hospitalA}'), ('${staffB}', 'hospital_staff', '${hospitalB}'),
    ('${interpreterA}', 'interpreter', null), ('${interpreterB}', 'interpreter', null);
`)
async function as(role, user = '') {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user}', false); set role ${role};`)
}
const rows = async (sql) => (await db.query(sql)).rows
async function denied(sql) { await assert.rejects(db.exec(sql)) }

await as('authenticated', staffA)
await db.exec(`insert into public.sessions(id, hospital_id, created_by, bed_label, patient_display_name, status)
  values ('${sessionA}', '${hospitalA}', '${staffA}', 'bed 1', 'Patient A', 'active');`)
await denied(`insert into public.sessions(hospital_id, created_by, bed_label)
  values ('${hospitalB}', '${staffA}', 'bed 1');`)
await denied(`insert into public.sessions(hospital_id, created_by, bed_label)
  values ('${hospitalA}', '${staffA}', 'bed 1');`)
await denied(`update public.profiles set role = 'hospital_admin' where id = '${staffA}';`)
await denied(`update public.profiles set hospital_id = '${hospitalB}' where id = '${staffA}';`)
await as('authenticated', staffB)
await db.exec(`insert into public.sessions(id, hospital_id, created_by, bed_label, status)
  values ('${sessionB}', '${hospitalB}', '${staffB}', 'bed 10', 'active');`)
assert.equal((await rows('select * from public.sessions')).length, 1)
await denied(`insert into public.session_events(session_id, event_type, actor_id)
  values ('${sessionA}', 'note', '${staffB}');`)
await as('anon')
assert.equal((await rows('select * from public.sessions')).length, 0)
assert.equal((await rows('select * from public.session_events')).length, 0)
await denied(`select public.consume_kiosk_pairing('${'a'.repeat(64)}', '${'b'.repeat(64)}');`)

await as('authenticated', staffA)
await db.exec(`insert into public.session_events(session_id, event_type, actor_id, payload)
  values ('${sessionA}', 'note', '${staffA}', '{"note":"Retain me"}');`)
await denied(`update public.session_events set payload = '{}' where session_id = '${sessionA}';`)
await denied(`delete from public.session_events where session_id = '${sessionA}';`)
await db.exec(`insert into public.kiosk_pairings(secret_hash, session_id, created_by, expires_at)
  values ('${'a'.repeat(64)}', '${sessionA}', '${staffA}', now() + interval '5 minutes');`)
await as('service_role')
assert.equal((await rows(`select public.consume_kiosk_pairing('${'a'.repeat(64)}', '${'b'.repeat(64)}') as id`))[0].id, sessionA)
assert.equal((await rows(`select public.consume_kiosk_pairing('${'a'.repeat(64)}', '${'c'.repeat(64)}') as id`))[0].id, null)
await denied(`delete from public.session_events where session_id = '${sessionA}';`)
await as('postgres') // The trigger also protects privileged maintenance operations.
await denied(`update public.session_events set payload = '{}' where session_id = '${sessionA}';`)
await denied('truncate public.session_events;')

await as('authenticated', staffA)
await db.exec(`update public.sessions set status = 'interpreter_requested' where id = '${sessionA}';`)
await as('authenticated', interpreterA)
assert.equal((await rows('select * from public.sessions')).length, 0)
assert.equal((await rows(`select public.claim_session('${sessionA}') as claimed`))[0].claimed, true)
assert.equal((await rows('select * from public.sessions')).length, 1)
await as('authenticated', interpreterB)
assert.equal((await rows(`select public.claim_session('${sessionA}') as claimed`))[0].claimed, false)
assert.equal((await rows('select * from public.sessions')).length, 0)
await as('authenticated', interpreterA)
assert.equal((await rows(`select public.set_interpreter_session_status('${sessionA}', 'active') as changed`))[0].changed, true)
await denied(`select public.set_interpreter_session_status('${sessionB}', 'closed');`)
await as('authenticated', staffA)
await db.exec(`update public.sessions set status = 'closed', closed_at = now() where id = '${sessionA}';`)
await as('service_role')
assert.ok((await rows(`select revoked_at from public.kiosk_tokens where session_id = '${sessionA}'`))[0].revoked_at)
assert.equal((await rows(`select count(*)::int as count from public.session_events where session_id = '${sessionA}'`))[0].count, 1)

await db.close()
console.log('Fresh migrations, hospital isolation, profile protection, audit retention, one-use pairing, claim ownership and discharge revocation passed.')

// Optional live Next server: node scripts/check-security.mjs http://localhost:3100
if (process.argv[2]) {
  const paths = [
    ['GET', '/api/session?list=true'], ['POST', '/api/session'],
    ['POST', '/api/livekit-token'], ['POST', '/api/isl-lookup'],
    ['GET', `/api/session/${sessionA}/events`], ['POST', `/api/session/${sessionA}/events`],
    ['DELETE', `/api/session/${sessionA}/events`], ['POST', `/api/session/${sessionA}/status`],
    ['POST', `/api/session/${sessionA}/request-interpreter`], ['POST', `/api/session/${sessionA}/pairing`],
    ['POST', `/api/session/${sessionA}/claim`], ['POST', `/api/patient/${sessionA}/events`],
    ['POST', `/api/patient/${sessionA}/clips`], ['POST', '/api/kiosk/pair'],
  ]
  for (const [method, path] of paths) {
    const response = await fetch(new URL(path, process.argv[2]), {
      method, headers: { 'Content-Type': 'application/json' }, ...(method === 'POST' ? { body: '{}' } : {}),
    })
    assert.ok([401, 403].includes(response.status), `${method} ${path}: expected 401/403, got ${response.status}`)
    console.log(`${response.status} ${method} ${path}`)
  }
  console.log('Every logged-out patient-data API request was denied.')
}
