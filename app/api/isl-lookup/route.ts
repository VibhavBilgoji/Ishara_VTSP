import { NextResponse } from 'next/server'
import { searchClips, getClipByKey, getClipUrl, resolveStorageFilename } from '@/lib/isl-clips'
import { matchClipWithGemini } from '@/lib/gemini-isl'
import { createClient } from '@/lib/supabase/server'
import { apiError, requireStaff, requireSameOrigin } from '@/lib/auth'

async function resolveSignedUrl(storageFile: string, defaultUrl: string): Promise<string> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createClient()
      const { data } = await supabase.storage
        .from('isl-clips')
        .createSignedUrl(storageFile, 3600)
      if (data?.signedUrl) {
        return data.signedUrl
      }
    } catch {}
  }
  return defaultUrl
}

export async function POST(request: Request) {
  try {
    await requireStaff()
    requireSameOrigin(request)
    const body = await request.json()
    const query = typeof body.query === 'string' ? body.query.trim() : ''
    const key = body.key

    // Direct key lookup (e.g. clicked a quick reassurance chip)
    if (key) {
      const clip = getClipByKey(key)
      if (!clip) {
        return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
      }

      const storageFile = resolveStorageFilename(clip.storage_path || clip.key)
      const signedUrl = await resolveSignedUrl(storageFile, getClipUrl(storageFile))

      return NextResponse.json({
        match: {
          clip,
          score: 1.0,
          signedUrl,
          matchedBy: 'exact',
        },
      })
    }

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // 1. Try Gemini semantic intent classification first (handles Hindi, Hinglish, medical synonyms, safety)
    let bestMatch = await matchClipWithGemini(query)
    let allMatches: any[] = []

    // 2. Fallback to local Fuse.js / token overlap search if Gemini didn't match or is unreachable
    if (!bestMatch) {
      const fuzzyMatches = searchClips(query, 3)
      if (fuzzyMatches.length > 0) {
        bestMatch = {
          ...fuzzyMatches[0],
          matchedBy: 'fuzzy',
        }
        allMatches = fuzzyMatches
      }
    } else {
      allMatches = [bestMatch]
    }

    if (!bestMatch) {
      return NextResponse.json({
        match: null,
        message: 'No matching ISL clip found. Please rephrase or request an interpreter.',
      })
    }

    const storageFile = resolveStorageFilename(bestMatch.clip.storage_path || bestMatch.clip.key)
    bestMatch.signedUrl = await resolveSignedUrl(
      storageFile,
      bestMatch.signedUrl || getClipUrl(storageFile)
    )

    return NextResponse.json({
      match: bestMatch,
      allMatches,
    })
  } catch (error) {
    return apiError(error)
  }
}
