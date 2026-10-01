import 'server-only'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { hashToken, kioskCookieName } from '@/lib/kiosk'
import { UUID_REGEX } from '@/lib/realtime'
import type { Profile, Session } from '@/lib/types'
import { isStaffRole } from '@/lib/roles'
export { isStaffRole } from '@/lib/roles'

export class AccessError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export function apiError(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status })
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  console.error('API request failed:', error)
  return NextResponse.json({ error: 'Request failed' }, { status: 500 })
}

async function currentProfile() {
  // Mark authorization as request-time even when a build has no environment configured.
  await cookies()
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new AccessError(401, 'Sign in required')
  }
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profileError || !profile) throw new AccessError(403, 'Account has no authorized profile')
  return { supabase, profile: profile as Profile }
}

export async function requireStaff() {
  const auth = await currentProfile()
  if (!auth) throw new AccessError(401, 'Sign in required')
  if (!isStaffRole(auth.profile.role) || !auth.profile.hospital_id) throw new AccessError(403, 'Hospital staff access required')
  return auth
}

export async function requireInterpreter() {
  const auth = await currentProfile()
  if (!auth) throw new AccessError(401, 'Sign in required')
  if (auth.profile.role !== 'interpreter') throw new AccessError(403, 'Interpreter access required')
  return auth
}

/** Staff use RLS; service-role is used only after kiosk verification. */
export async function requireSessionAccess(sessionId: string, allowInterpreter = true) {
  const auth = await currentProfile()
  const cookie = (await cookies()).get(kioskCookieName(sessionId))?.value
  if (!auth && !cookie) throw new AccessError(401, 'Sign in or pair this tablet')
  if (!UUID_REGEX.test(sessionId)) throw new AccessError(404, 'Session not found')
  if (auth) {
    const staff = isStaffRole(auth.profile.role) && Boolean(auth.profile.hospital_id)
    const interpreter = allowInterpreter && auth.profile.role === 'interpreter'
    if (staff || interpreter) {
      let query = auth.supabase.from('sessions').select('*').eq('id', sessionId)
      query = staff ? query.eq('hospital_id', auth.profile.hospital_id!) : query.eq('assigned_interpreter_id', auth.profile.id)
      const { data, error } = await query.maybeSingle()
      if (error) throw error
      if (data) return { ...auth, session: data as Session, kind: staff ? 'staff' as const : 'interpreter' as const }
    }
  }
  if (cookie && /^[a-f0-9]{64}$/.test(cookie)) {
    const supabase = createServiceClient()
    const { data: token, error } = await supabase.from('kiosk_tokens')
      .select('session_id').eq('token_hash', hashToken(cookie)).eq('session_id', sessionId)
      .is('revoked_at', null).gt('expires_at', new Date().toISOString()).maybeSingle()
    if (error) throw error
    if (token) {
      const { data: session, error: sessionError } = await supabase.from('sessions')
        .select('*').eq('id', sessionId).neq('status', 'closed').maybeSingle()
      if (sessionError) throw sessionError
      if (session) return { supabase, profile: null, session: session as Session, kind: 'kiosk' as const }
    }
  }
  throw new AccessError(auth ? 403 : 401, 'No access to this session')
}

export function requireKioskOrStaff(sessionId: string) { return requireSessionAccess(sessionId, false) }

export async function sessionHospital(auth: Awaited<ReturnType<typeof requireSessionAccess>>) {
  const { data, error } = await auth.supabase.from('hospitals').select('id, name').eq('id', auth.session.hospital_id).single()
  if (error) throw error
  return data
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new AccessError(403, 'Cross-origin request denied')
  }
}
