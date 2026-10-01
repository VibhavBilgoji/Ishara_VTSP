import { NextResponse } from 'next/server'
import { apiError, requireStaff } from '@/lib/auth'
import {
  REQUEST_EVENT_TYPES,
  REQUEST_STATUS_NOTE_KIND,
  hindiForPictogram,
  isUrgentSign,
  type NurseRequest,
  type RequestStatus,
} from '@/lib/nurse-requests'

const WINDOW_HOURS = 24

/** Patient requests across every open bed in the signed-in staff member's hospital. */
export async function GET() {
  try {
    const { supabase, profile } = await requireStaff()

    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, bed_label, patient_display_name')
      .eq('hospital_id', profile.hospital_id!)
      .neq('status', 'closed')
    if (sessionsError) throw sessionsError

    const { data: hospital } = await supabase.from('hospitals').select('name').eq('id', profile.hospital_id!).maybeSingle()
    const hospitalName = (hospital?.name as string | undefined) ?? null
    if (!sessions?.length) return NextResponse.json({ requests: [], hospitalName })

    const bedById = new Map(sessions.map((s) => [s.id as string, s]))
    const since = new Date(Date.now() - WINDOW_HOURS * 3600_000).toISOString()

    // RLS also scopes session_events to this hospital; the session filter keeps it to open beds.
    const { data: events, error: eventsError } = await supabase
      .from('session_events')
      .select('id, session_id, event_type, payload, created_at')
      .in('session_id', [...bedById.keys()])
      .in('event_type', [...REQUEST_EVENT_TYPES, 'note'])
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000)
    if (eventsError) throw eventsError

    // Newest first, so the first status note seen for a request is its current status
    const statusByRequest = new Map<string, { status: RequestStatus; at: string }>()
    for (const event of events ?? []) {
      const payload = (event.payload ?? {}) as Record<string, unknown>
      if (event.event_type === 'note' && payload.kind === REQUEST_STATUS_NOTE_KIND) {
        const requestId = payload.requestEventId
        const status = payload.status
        if (typeof requestId === 'string' && (status === 'acknowledged' || status === 'done') && !statusByRequest.has(requestId)) {
          statusByRequest.set(requestId, { status, at: event.created_at as string })
        }
      }
    }

    const requests: NurseRequest[] = []
    for (const event of events ?? []) {
      if (!(REQUEST_EVENT_TYPES as readonly string[]).includes(event.event_type as string)) continue
      const bed = bedById.get(event.session_id as string)
      if (!bed) continue
      const payload = (event.payload ?? {}) as Record<string, unknown>
      const isTap = event.event_type === 'pictogram'
      const label = String((isTap ? payload.label : payload.text) ?? (isTap ? payload.clipKey : 'Signed message') ?? 'Request')
      const status = statusByRequest.get(event.id as string)
      requests.push({
        id: event.id as string,
        sessionId: event.session_id as string,
        bedLabel: (bed.bed_label as string) || 'Bed',
        patientName: (bed.patient_display_name as string | null) ?? null,
        source: isTap ? 'tap' : 'sign',
        label,
        hindi: isTap ? hindiForPictogram(payload.clipKey) : null,
        detail: typeof payload.extraNote === 'string' ? payload.extraNote : null,
        isUrgent: isTap ? payload.isUrgent === true || payload.priority === 'P0' : isUrgentSign(payload.text),
        createdAt: event.created_at as string,
        status: status?.status ?? 'new',
        statusAt: status?.at ?? null,
      })
    }

    return NextResponse.json({ requests, hospitalName })
  } catch (error) {
    return apiError(error)
  }
}
