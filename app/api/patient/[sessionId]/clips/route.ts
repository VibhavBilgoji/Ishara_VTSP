import { NextResponse } from 'next/server'
import { getClipByKey, getClipUrl } from '@/lib/isl-clips'
import { apiError, requireKioskOrStaff, requireSameOrigin } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    await requireKioskOrStaff(sessionId)
    requireSameOrigin(request)
    const body = await request.json()
    const { clipKey } = body

    const clip = getClipByKey(clipKey)
    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
    }

    const clipUrl = getClipUrl(clip.storage_path || clip.key)

    return NextResponse.json({
      success: true,
      sessionId,
      clip,
      clipUrl,
    })
  } catch (error) {
    return apiError(error)
  }
}
