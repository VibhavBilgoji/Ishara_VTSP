import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isStaffRole } from '@/lib/roles'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error && data.user) {
        const { data: profile } = await supabase.from('profiles').select('role, hospital_id').eq('id', data.user.id).single()
        const next = profile?.role === 'interpreter' ? '/interpreter/dashboard'
          : profile && isStaffRole(profile.role) && profile.hospital_id ? '/dashboard' : '/login'
        return NextResponse.redirect(new URL(next, origin))
      }
    } catch (err) {
      console.warn('Auth exchangeCodeForSession error:', err)
    }
  }

  return NextResponse.redirect(new URL('/login', origin))
}
