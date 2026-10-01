import { NextResponse } from 'next/server'
import { apiError, requireKioskOrStaff, requireSameOrigin } from '@/lib/auth'
import { appendEvent } from '@/lib/session-events'

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const auth = await requireKioskOrStaff((await params).sessionId)
    requireSameOrigin(request)
    const event = await appendEvent(auth, await request.json())
    return NextResponse.json({ success: true, event })
  } catch (error) { return apiError(error) }
}
