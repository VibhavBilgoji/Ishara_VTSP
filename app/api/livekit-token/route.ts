import { NextResponse } from 'next/server'
import { createLiveKitToken } from '@/lib/livekit'
import { AccessError, apiError, requireSessionAccess, requireSameOrigin } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const body = await request.json()
    const auth = await requireSessionAccess(typeof body.roomName === 'string' ? body.roomName : '')
    if (auth.session.status === 'closed') throw new AccessError(403, 'Session is closed')
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.NEXT_PUBLIC_LIVEKIT_URL) {
      throw new AccessError(503, 'Video calls are not configured')
    }
    const identity = auth.kind === 'kiosk' ? `patient-${auth.session.id}` : `${auth.kind}-${auth.profile!.id}`
    const name = auth.kind === 'kiosk' ? 'Bedside patient' : auth.profile!.full_name || auth.kind
    const token = await createLiveKitToken(auth.session.id, name, identity)
    return NextResponse.json({ token, serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL, simulated: false })
  } catch (error) { return apiError(error) }
}
