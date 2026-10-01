import { SEED_ISL_CLIPS } from './seed-clips'
import { getClipByKey, getClipUrl, hasNegationOrContradiction, resolveStorageFilename } from './isl-clips'
import type { ISLClipMatch } from './types'

// Compact catalog summary specifically formatted for LLM semantic categorization
const CLIP_CATALOG_SUMMARY = SEED_ISL_CLIPS.map(
  (c) =>
    `- key: "${c.key}", label: "${c.label}", category: "${c.category || 'General'}", aliases: [${(c.aliases || []).slice(0, 5).map((a) => `"${a}"`).join(', ')}]`
).join('\n')

interface GeminiMatchResponse {
  matched: boolean
  clip_key: string | null
  confidence: number
  reasoning: string
}

/**
 * Semantic intent classification using Google Gemini.
 * Matches spoken or typed clinical phrases (in English, Hindi, Hinglish, or other Indian languages)
 * to the closest pre-recorded Indian Sign Language (ISL) video clip.
 */
export async function matchClipWithGemini(query: string): Promise<ISLClipMatch | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return null
  }

  const cleanQuery = (query || '').trim()
  if (!cleanQuery || hasNegationOrContradiction(cleanQuery)) {
    return null
  }

  const model = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`

  const systemInstruction = `You are an expert clinical Indian Sign Language (ISL) triage and translation assistant in an Indian hospital.
The doctor, nurse, or medical staff has dictated or typed a clinical communication directed to a deaf or hard-of-hearing patient.
Input may be in English, Hindi, Hinglish, or other Indian languages.

Your sole job is to match the clinical communication to the SINGLE BEST PRE-RECORDED ISL CLIP from the catalog below.

AVAILABLE ISL VIDEO CLIP CATALOG:
${CLIP_CATALOG_SUMMARY}

CRITICAL CLINICAL SAFETY RULES:
1. MEDICAL SAFETY & CONTRADICTION: If the clinician says NOT to do something or contradicts the action (e.g., "Do NOT take this medicine", "Do not move", "You are NOT safe", "We are stopping the test"), you MUST return matched: false. NEVER play an action video for a negative instruction!
2. MULTILINGUAL & COLLOQUIAL: Recognize Hindi/Hinglish/regional phrasing (e.g. "Dawa le lo" or "goli khao" -> "take-medicine", "Ghabrao mat" or "chinta mat karo" -> "you-are-safe", "Hilna mat" or "seedhe baithiye" -> "stay-still", "Gehri saans lo" -> "relax", "Parivaar hai aapka yahan?" -> "family-here", "Khoon ki jaanch" -> "need-to-do-test").
3. CONFIDENCE THRESHOLD: Only return matched: true if the input clearly conveys the clinical intent of the clip. If the input is unrelated small talk, a complex medical explanation not represented in the catalog, or ambiguous, return matched: false so the staff can page a live human ISL interpreter.
4. JSON FORMAT: Return valid JSON strictly matching:
{
  "matched": boolean,
  "clip_key": string | null,
  "confidence": number, // float from 0.0 to 1.0
  "reasoning": string
}`

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            parts: [{ text: `Clinician message to patient: "${cleanQuery}"` }],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
        },
      }),
      // Fast timeout so doctor UI never hangs if external API latency spikes
      signal: AbortSignal.timeout(4000),
    })

    if (!res.ok) {
      console.warn(`[Gemini ISL] API returned status ${res.status}: ${res.statusText}`)
      return null
    }

    const data = await res.json()
    const contentText = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!contentText) {
      return null
    }

    const parsed: GeminiMatchResponse = JSON.parse(contentText)

    if (parsed.matched && parsed.clip_key && parsed.confidence >= 0.6) {
      const clip = getClipByKey(parsed.clip_key)
      if (clip) {
        const storageFile = resolveStorageFilename(clip.storage_path || clip.key)
        return {
          clip,
          score: Math.min(Math.max(parsed.confidence, 0.7), 0.99),
          signedUrl: getClipUrl(storageFile),
          matchedBy: 'gemini',
          reasoning: parsed.reasoning || 'Matched using Gemini semantic understanding',
        }
      }
    }
  } catch (err) {
    console.warn('[Gemini ISL] Error during semantic lookup, falling back to local search:', err)
  }

  return null
}
