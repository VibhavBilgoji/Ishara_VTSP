import { NextResponse } from 'next/server'
import { AccessError, apiError, requireKioskOrStaff, requireSameOrigin, sessionHospital } from '@/lib/auth'
import { getSessionChannel, INTERPRETER_REQUESTS_CHANNEL, REALTIME_EVENTS } from '@/lib/realtime'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireKioskOrStaff((await params).id)
    requireSameOrigin(request)
    const body = await request.json()
    if (auth.session.status === 'closed') throw new AccessError(403, 'Session is closed')
    const hospital = await sessionHospital(auth)
    const requestedAt = new Date().toISOString()
    const note = typeof body.note === 'string' ? body.note.slice(0, 500) : 'Bedside interpreter request'
    const { data: updated, error } = await auth.supabase.from('sessions').update({
      status: 'interpreter_requested', active_mode: 'live_interpreter', requested_at: requestedAt,
    }).eq('id', auth.session.id).neq('status', 'closed').select('id').maybeSingle()
    if (error) throw error
    if (!updated) throw new AccessError(409, 'Session is already closed')
    const { error: eventError } = await auth.supabase.from('session_events').insert({
      session_id: auth.session.id, event_type: 'interpreter_requested', actor_id: auth.profile?.id ?? null,
      payload: { requestedAt, note },
    })
    if (eventError) throw eventError
    const callRequest = {
      id: auth.session.id, sessionId: auth.session.id, hospitalName: hospital.name,
      patientName: auth.session.bed_label, note, requestedAt,
    }
    // A failed broadcast must not hide a successfully persisted call from the polling queue.
    await Promise.allSettled([
      auth.supabase.channel(INTERPRETER_REQUESTS_CHANNEL).httpSend(REALTIME_EVENTS.NEW_REQUEST, callRequest),
      auth.supabase.channel(getSessionChannel(auth.session.id)).httpSend(REALTIME_EVENTS.STATUS_CHANGE, {
        type: 'status_change', sessionId: auth.session.id, newStatus: 'interpreter_requested', timestamp: requestedAt,
      }),
    ])
    return NextResponse.json({ success: true, sessionId: auth.session.id, status: 'interpreter_requested', request: callRequest })
  } catch (error) { return apiError(error) }
}
