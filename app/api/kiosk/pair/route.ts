import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AccessError, apiError, requireSameOrigin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { newToken, hashToken, kioskCookieName, KIOSK_TTL_SECONDS } from '@/lib/kiosk'

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const { secret } = await request.json()
    if (typeof secret !== 'string' || !/^[a-f0-9]{64}$/.test(secret)) throw new AccessError(401, 'Invalid pairing secret')
    const token = newToken()
    const supabase = createServiceClient()
    const { data: sessionId, error } = await supabase.rpc('consume_kiosk_pairing', {
      pairing_hash: hashToken(secret), kiosk_hash: hashToken(token),
    })
    if (error) throw error
    if (!sessionId) throw new AccessError(401, 'Pairing link expired or already used. Ask staff for a new QR code.')
    const cookieStore = await cookies()
    cookieStore.set(kioskCookieName(sessionId), token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: KIOSK_TTL_SECONDS,
    })
    return NextResponse.json({ sessionId }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error) }
}
