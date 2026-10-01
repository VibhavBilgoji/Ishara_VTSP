import { NextResponse } from 'next/server'
import { AccessError, apiError, requireStaff, requireSessionAccess, requireSameOrigin, sessionHospital } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { supabase, profile } = await requireStaff()
    requireSameOrigin(request)
    const body = await request.json()
    const patientName = typeof body.patientDisplayName === 'string' ? body.patientDisplayName.trim() : ''
    const bedLabel = typeof body.bedLabel === 'string' ? body.bedLabel.trim().replace(/\s+/g, ' ').toLowerCase() : ''
    if (!patientName || patientName.length > 200 || !bedLabel || bedLabel.length > 80) {
      throw new AccessError(400, 'Patient name and bed label are required (maximum 200 and 80 characters)')
    }
    const { data, error } = await supabase.from('sessions').insert({
      hospital_id: profile.hospital_id, created_by: profile.id, patient_display_name: patientName,
      bed_label: bedLabel, status: 'active', active_mode: 'pictogram',
    }).select().single()
    if (error?.code === '23505') throw new AccessError(409, 'This bed already has an active session')
    if (error) throw error
    return NextResponse.json({ session: data }, { status: 201 })
  } catch (error) { return apiError(error) }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (id) {
      const auth = await requireSessionAccess(id)
      const hospital = auth.kind === 'interpreter' ? null : await sessionHospital(auth)
      return NextResponse.json({ session: auth.session, hospital })
    }
    const { supabase, profile } = await requireStaff()
    const bed = searchParams.get('bed') || searchParams.get('q')
    let query = supabase.from('sessions').select('*').eq('hospital_id', profile.hospital_id!).neq('status', 'closed')
    if (bed) query = query.eq('bed_label', bed.trim().replace(/\s+/g, ' ').toLowerCase())
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    if (bed) {
      if (!data?.length) throw new AccessError(404, 'Bed not found')
      return NextResponse.json({ session: data[0] })
    }
    const { data: hospital, error: hospitalError } = await supabase.from('hospitals')
      .select('id, name').eq('id', profile.hospital_id!).single()
    if (hospitalError) throw hospitalError
    const sessions = searchParams.get('labels') === 'true'
      ? data.map(({ id, bed_label, status }) => ({ id, bed_label, status })) : data
    return NextResponse.json({ sessions, hospital })
  } catch (error) { return apiError(error) }
}
