import { NextResponse } from 'next/server'
import { apiError, requireInterpreter } from '@/lib/auth'

export async function GET() {
  try {
    const { supabase } = await requireInterpreter()
    const { data, error } = await supabase.rpc('list_interpreter_requests')
    if (error) throw error
    return NextResponse.json({ requests: (data || []).map((request: {
      session_id: string; hospital_name: string; bed_label: string; requested_at: string;
    }) => ({
      id: request.session_id, sessionId: request.session_id, hospitalName: request.hospital_name,
      patientName: request.bed_label, requestedAt: request.requested_at,
    })) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return apiError(error) }
}
