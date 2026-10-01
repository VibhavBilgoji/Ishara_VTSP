import { AccessError, requireSessionAccess } from '@/lib/auth'

export async function appendEvent(auth: Awaited<ReturnType<typeof requireSessionAccess>>, body: {
  eventType?: unknown; payload?: unknown;
}) {
  const type = body.eventType ?? (auth.kind === 'kiosk' ? 'pictogram' : 'note')
  const allowed = auth.kind === 'kiosk' ? ['pictogram', 'gesture_text']
    : ['pictogram', 'isl_played', 'gesture_text', 'staff_message', 'interpreter_requested', 'interpreter_joined', 'interpreter_left', 'note']
  if (typeof type !== 'string' || !allowed.includes(type)) throw new AccessError(400, 'Invalid event type')
  if (body.payload !== undefined && (body.payload === null || typeof body.payload !== 'object' || Array.isArray(body.payload))) {
    throw new AccessError(400, 'Event payload must be an object')
  }
  if (auth.session.status === 'closed') throw new AccessError(403, 'Session is closed')
  const { data, error } = await auth.supabase.from('session_events').insert({
    session_id: auth.session.id, event_type: type, payload: body.payload ?? {}, actor_id: auth.profile?.id ?? null,
  }).select().single()
  if (error) throw error
  return data
}
