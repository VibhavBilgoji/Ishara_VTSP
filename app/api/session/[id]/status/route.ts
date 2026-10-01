import { NextResponse } from 'next/server'
import { AccessError, apiError, requireSessionAccess, requireSameOrigin } from '@/lib/auth'
import { getSessionChannel, REALTIME_EVENTS } from '@/lib/realtime'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSessionAccess((await params).id)
    requireSameOrigin(request)
    const { status, activeMode, interpreterId } = await request.json()
    const allowed = auth.kind === 'staff'
      ? ['waiting', 'active', 'interpreter_requested', 'interpreter_connected', 'ai_fallback', 'closed']
      : auth.kind === 'kiosk' ? ['active', 'ai_fallback'] : ['active', 'interpreter_connected']
    if (status !== undefined && !allowed.includes(status)) throw new AccessError(403, 'Status change is not permitted')
    if (activeMode !== undefined && !['pictogram', 'ai_fallback', 'live_interpreter', 'gesture_ai'].includes(activeMode)) {
      throw new AccessError(400, 'Invalid session mode')
    }
    if (interpreterId !== undefined) throw new AccessError(403, 'Interpreter assignment requires a session claim')
    if (auth.session.status === 'closed') throw new AccessError(403, 'Session is closed')
    if (status === undefined && activeMode === undefined) throw new AccessError(400, 'Status or mode is required')
    const update: Record<string, string | null> = {}
    if (status !== undefined) update.status = status
    if (activeMode !== undefined) update.active_mode = activeMode
    if (status === 'closed') update.closed_at = new Date().toISOString()
    if (status === 'active') update.assigned_interpreter_id = null
    if (auth.kind === 'interpreter') {
      if (!status) throw new AccessError(403, 'Interpreters may only change call status')
      const { data, error } = await auth.supabase.rpc('set_interpreter_session_status', {
        target_id: auth.session.id, new_status: status,
      })
      if (error) throw error
      if (!data) throw new AccessError(409, 'Session assignment changed')
    } else {
      const { data, error } = await auth.supabase.from('sessions').update(update)
        .eq('id', auth.session.id).neq('status', 'closed').select('id').maybeSingle()
      if (error) throw error
      if (!data) throw new AccessError(409, 'Session is already closed')
    }
    if (status) await auth.supabase.channel(getSessionChannel(auth.session.id)).httpSend(REALTIME_EVENTS.STATUS_CHANGE, {
      type: 'status_change', sessionId: auth.session.id, newStatus: status, timestamp: new Date().toISOString(),
    })
    return NextResponse.json({ success: true, sessionId: auth.session.id, status, activeMode })
  } catch (error) { return apiError(error) }
}
