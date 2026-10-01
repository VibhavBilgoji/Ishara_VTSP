import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isStaffRole } from '@/lib/roles'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const path = request.nextUrl.pathname
  const publicPage = path === '/' || path === '/login' || path === '/pair' || path.startsWith('/auth/')
  if (publicPage || path === '/api/kiosk/pair') return supabaseResponse
  const isApi = path.startsWith('/api/')
  const denied = () => isApi
    ? NextResponse.json({ error: 'Sign in or pair this tablet' }, { status: 401 })
    : NextResponse.redirect(new URL(path.startsWith('/interpreter') ? '/auth/interpreter' : '/login', request.url))
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return denied()

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // The route handler/layout performs the database verification, including expiration and revocation.
    const hasKioskCookie = request.cookies.getAll().some(({ name, value }) =>
      name.startsWith('ishara_kiosk_') && /^[a-f0-9]{64}$/.test(value))
    if (hasKioskCookie && (isApi || path.startsWith('/patient/'))) return supabaseResponse
    return denied()
  }
  if (isApi) return supabaseResponse // Every API handler performs its own role/session check.
  const { data: profile } = await supabase.from('profiles').select('role, hospital_id').eq('id', user.id).single()
  const staff = profile && isStaffRole(profile.role) && Boolean(profile.hospital_id)
  const interpreter = profile?.role === 'interpreter'
  if ((path.startsWith('/dashboard') && !staff) || (path.startsWith('/interpreter') && !interpreter)) {
    const response = NextResponse.redirect(new URL(interpreter ? '/interpreter/dashboard' : staff ? '/dashboard' : '/login', request.url))
    for (const cookie of supabaseResponse.cookies.getAll()) response.cookies.set(cookie)
    return response
  }
  return supabaseResponse
}
