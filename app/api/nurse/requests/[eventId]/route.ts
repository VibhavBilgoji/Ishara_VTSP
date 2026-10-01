import { NextResponse } from 'next/server'
import { AccessError, apiError, requireSameOrigin, requireSessionAccess, requireStaff } from '@/lib/auth'
import { appendEvent } from '@/lib/session-events'
import { UUID_REGEX } from '@/lib/realtime'
import { REQUEST_EVENT_TYPES, REQUEST_STATUSES, REQUEST_STATUS_NOTE_KIND, type RequestStatus } from '@/lib/nurse-requests'

/**
 * Record a nurse response ("on my way" / "done") to a patient request.
 * Stored as an append-only audit note, so the original request is never altered.
 */
export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    requireSameOrigin(request)
    const { eventId } = await params
    if (!UUID_REGEX.test(eventId)) throw new AccessError(404, 'Request not found')

    const body = await request.json()
    const status = body?.status as RequestStatus
    if (!REQUEST_STATUSES.includes(status)) throw new AccessError(400, 'Status must be acknowledged or done')

    // RLS limits this read to events in the staff member's hospital
    const { supabase } = await requireStaff()
    const { data: original, error } = await supabase
      .from('session_events')
      .select('id, session_id, event_type, payload')
      .eq('id', eventId)
      .maybeSingle()
    if (error) throw error
    if (!original || !(REQUEST_EVENT_TYPES as readonly string[]).includes(original.event_type as string)) {
      throw new AccessError(404, 'Request not found')
    }

    const auth = await requireSessionAccess(original.session_id as string, false)
    if (auth.kind !== 'staff') throw new AccessError(403, 'Hospital staff access required')

    const payload = (original.payload ?? {}) as Record<string, unknown>
    const label = String(payload.label ?? payload.text ?? 'Request')
    const event = await appendEvent(auth, {
      eventType: 'note',
      payload: { kind: REQUEST_STATUS_NOTE_KIND, requestEventId: eventId, status, label },
    })

    return NextResponse.json({ event, sessionId: original.session_id, label })
  } catch (error) {
    return apiError(error)
  }
}
