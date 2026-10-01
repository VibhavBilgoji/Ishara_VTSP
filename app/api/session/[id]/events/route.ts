import { NextResponse } from 'next/server'
import { apiError, requireSessionAccess, requireSameOrigin } from '@/lib/auth'
import { appendEvent } from '@/lib/session-events'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSessionAccess((await params).id)
    const { data, error } = await auth.supabase.from('session_events').select('*')
      .eq('session_id', auth.session.id).order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ events: data })
  } catch (error) { return apiError(error) }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSessionAccess((await params).id)
    requireSameOrigin(request)
    const event = await appendEvent(auth, await request.json())
    return NextResponse.json({ event })
  } catch (error) { return apiError(error) }
}
