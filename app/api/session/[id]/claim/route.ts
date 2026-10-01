import { NextResponse } from 'next/server'
import { AccessError, apiError, requireInterpreter, requireSameOrigin } from '@/lib/auth'
import { UUID_REGEX, getSessionChannel, REALTIME_EVENTS } from '@/lib/realtime'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireInterpreter()
    requireSameOrigin(request)
    const { id } = await params
    if (!UUID_REGEX.test(id)) throw new AccessError(404, 'Session not found')
    const { data, error } = await supabase.rpc('claim_session', { session_id: id })
    if (error) throw error
    if (!data) throw new AccessError(409, 'Taken by another interpreter or no longer available')
    await supabase.channel(getSessionChannel(id)).httpSend(REALTIME_EVENTS.STATUS_CHANGE, {
      type: 'status_change', sessionId: id, newStatus: 'interpreter_connected', timestamp: new Date().toISOString(),
    })
    return NextResponse.json({ success: true })
  } catch (error) { return apiError(error) }
}
