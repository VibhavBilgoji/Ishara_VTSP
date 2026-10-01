import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { AccessError, apiError, requireStaff, requireKioskOrStaff, requireSameOrigin } from '@/lib/auth'
import { newToken, hashToken, PAIRING_TTL_SECONDS } from '@/lib/kiosk'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff()
    requireSameOrigin(request)
    const { id } = await params
    const auth = await requireKioskOrStaff(id)
    if (auth.kind !== 'staff' || auth.session.status === 'closed') throw new AccessError(403, 'Active staff session required')
    const secret = newToken()
    const expiresAt = new Date(Date.now() + PAIRING_TTL_SECONDS * 1000).toISOString()
    const { error } = await auth.supabase.from('kiosk_pairings').insert({
      session_id: id, secret_hash: hashToken(secret), created_by: auth.profile!.id, expires_at: expiresAt,
    })
    if (error) throw error
    // Fragments never reach server access logs or Referrer headers.
    const url = `${new URL(request.url).origin}/pair#${secret}`
    const qrCode = await QRCode.toDataURL(url, { width: 256, margin: 2, errorCorrectionLevel: 'M' })
    return NextResponse.json({ url, qrCode, expiresAt }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error) }
}
