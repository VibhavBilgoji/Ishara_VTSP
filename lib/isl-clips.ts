import Fuse, { type IFuseOptions } from 'fuse.js'
import type { ISLClip, ISLClipMatch } from './types'
import { SEED_ISL_CLIPS } from './seed-clips'

let fuseIndex: Fuse<ISLClip> | null = null
let cachedClips: ISLClip[] = []

/**
 * Exact Supabase Storage filename mapping for all ISL clips.
 * Supports clean slugs, legacy filenames, and direct storage filenames.
 */
export const STORAGE_FILE_MAP: Record<string, string> = {
  // Emergency
  'chest-pain': 'Chest_Pain_20260912090504.mp4',
  'chest-pain.mp4': 'Chest_Pain_20260912090504.mp4',
  'cant-breathe': 'Can_t_Breathe_20260913001224.mp4',
  'cant-breathe.mp4': 'Can_t_Breathe_20260913001224.mp4',
  'im-dizzy': 'I_m_Dizzy_20260913001318.mp4',
  'im-dizzy.mp4': 'I_m_Dizzy_20260913001318.mp4',
  'feel-very-sick': 'I_Feel_very_sick_20260913001436.mp4',
  'feel-very-sick.mp4': 'I_Feel_very_sick_20260913001436.mp4',
  'call-doctor-now': 'Call_Doctor_Now_20260913001436.mp4',
  'call-doctor-now.mp4': 'Call_Doctor_Now_20260913001436.mp4',
  'emergency': 'Help_Me_20260913001436.mp4',
  'emergency.mp4': 'Help_Me_20260913001436.mp4',
  'help-me': 'Help_Me_20260913001436.mp4',
  'help-me.mp4': 'Help_Me_20260913001436.mp4',

  // Pain
  'pain-level': 'Pain_level_1-10_20260913001435.mp4',
  'pain-level.mp4': 'Pain_level_1-10_20260913001435.mp4',
  'head-hurts': 'My_Head_hurts_20260913001437.mp4',
  'head-hurts.mp4': 'My_Head_hurts_20260913001437.mp4',
  'stomach-hurts': 'My_stomach_hurts_20260913001436.mp4',
  'stomach-hurts.mp4': 'My_stomach_hurts_20260913001436.mp4',
  'chest-hurts': 'My_chest_hurts_20260913001436.mp4',
  'chest-hurts.mp4': 'My_chest_hurts_20260913001436.mp4',
  'back-hurts': 'My_back_hurts_20260913001436.mp4',
  'back-hurts.mp4': 'My_back_hurts_20260913001436.mp4',
  'pain-started-now': 'Pain_started_now_20260913001437.mp4',
  'pain-started-now.mp4': 'Pain_started_now_20260913001437.mp4',

  // Allergies
  'i-have-allergy': 'I_have_allergy_20260913001436.mp4',
  'i-have-allergy.mp4': 'I_have_allergy_20260913001436.mp4',
  'allergic-penicillin': 'allergic_to_penicillin_20260913001436.mp4',
  'allergic-penicillin.mp4': 'allergic_to_penicillin_20260913001436.mp4',
  'allergic-aspirin': 'Allergic_to_aspirin_20260913001437.mp4',
  'allergic-aspirin.mp4': 'Allergic_to_aspirin_20260913001437.mp4',
  'allergic-latex': 'allergic_to_latex_20260913001436.mp4',
  'allergic-latex.mp4': 'allergic_to_latex_20260913001436.mp4',
  'no-known-allergy': 'No_known_allergy_20260913001436.mp4',
  'no-known-allergy.mp4': 'No_known_allergy_20260913001436.mp4',

  // Basic needs
  'water': 'Water_20260913001437.mp4',
  'water.mp4': 'Water_20260913001437.mp4',
  'toilet': 'Toilet_20260913001436.mp4',
  'toilet.mp4': 'Toilet_20260913001436.mp4',
  'cold': 'Cold_20260913001436.mp4',
  'cold.mp4': 'Cold_20260913001436.mp4',
  'hot': 'Hot_20260913001436.mp4',
  'hot.mp4': 'Hot_20260913001436.mp4',
  'blanket': 'Blanket_20260913001436.mp4',
  'blanket.mp4': 'Blanket_20260913001436.mp4',
  'hungry': 'Hungry_20260913001435.mp4',
  'hungry.mp4': 'Hungry_20260913001435.mp4',
  'nausea': 'Nausea_20260913001435.mp4',
  'nausea.mp4': 'Nausea_20260913001435.mp4',
  'vomit': 'Vomit_20260913001435.mp4',
  'vomit.mp4': 'Vomit_20260913001435.mp4',

  // Medical history
  'diabetic': 'Diabetic_20260913001437.mp4',
  'diabetic.mp4': 'Diabetic_20260913001437.mp4',
  'heart-condition': 'Heart_condition_20260913001436.mp4',
  'heart-condition.mp4': 'Heart_condition_20260913001436.mp4',
  'high-blood-pressure': 'high_blood_pressure_20260913001436.mp4',
  'high-blood-pressure.mp4': 'high_blood_pressure_20260913001436.mp4',
  'pregnant': 'Pregnant_20260913001436.mp4',
  'pregnant.mp4': 'Pregnant_20260913001436.mp4',
  'surgery-before': 'Before_Surgery_20260913001436.mp4',
  'surgery-before.mp4': 'Before_Surgery_20260913001436.mp4',
  'blood-type': 'Blood_type_20260913001437.mp4',
  'blood-type.mp4': 'Blood_type_20260913001437.mp4',

  // Doctor to patient
  'you-are-safe': 'You_are_safe_20260913001437.mp4',
  'you-are-safe.mp4': 'You_are_safe_20260913001437.mp4',
  'we-are-helping': 'We_are_helping_you_20260913001436.mp4',
  'we-are-helping.mp4': 'We_are_helping_you_20260913001436.mp4',
  'do-you-understand': 'Do_you_understand__20260913002754.mp4',
  'do-you-understand.mp4': 'Do_you_understand__20260913002754.mp4',
  'take-medicine': 'Take_this_medicine_20260913001437.mp4',
  'take-medicine.mp4': 'Take_this_medicine_20260913001437.mp4',
  'stay-still': 'Stay_Still_20260913001436.mp4',
  'stay-still.mp4': 'Stay_Still_20260913001436.mp4',
  'relax': 'Relax_20260913001435.mp4',
  'relax.mp4': 'Relax_20260913001435.mp4',
  'good': 'Good_20260913001435.mp4',
  'good.mp4': 'Good_20260913001435.mp4',

  // Consent
  'do-you-agree': 'Do_you_agree__20260913002935.mp4',
  'do-you-agree.mp4': 'Do_you_agree__20260913002935.mp4',
  'sign-here': 'Sign_here_20260913001435.mp4',
  'sign-here.mp4': 'Sign_here_20260913001435.mp4',
  'need-to-do-test': 'We_need_to_do_a_test_20260913001435.mp4',
  'need-to-do-test.mp4': 'We_need_to_do_a_test_20260913001435.mp4',
  'this-will-help': 'This_will_help_you__20260913001435.mp4',
  'this-will-help.mp4': 'This_will_help_you__20260913001435.mp4',
  'family-here': 'Do_you_have_a_family_here_20260913001435.mp4',
  'family-here.mp4': 'Do_you_have_a_family_here_20260913001435.mp4',
}

/**
 * Resolve any storage path or key to its exact filename in the isl-clips bucket.
 */
export function resolveStorageFilename(pathOrKey: string): string {
  if (!pathOrKey) return ''
  const trimmed = pathOrKey.trim()
  if (STORAGE_FILE_MAP[trimmed]) {
    return STORAGE_FILE_MAP[trimmed]
  }

  // Check normalized version (e.g. "take_medicine", "take medicine")
  const slug = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '-')
  if (STORAGE_FILE_MAP[slug]) {
    return STORAGE_FILE_MAP[slug]
  }

  return trimmed
}

/**
 * Get direct public URL to the ISL video clip in Supabase Storage.
 * Supabase storage bucket 'isl-clips' is public, so this provides zero-overhead instant streaming.
 */
export function getClipUrl(storagePathOrKey: string): string {
  const filename = resolveStorageFilename(storagePathOrKey)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://paaatkjykvnmgghbqesk.supabase.co'
  return `${supabaseUrl}/storage/v1/object/public/isl-clips/${encodeURIComponent(filename)}`
}

const FUSE_OPTIONS: IFuseOptions<ISLClip> = {
  keys: [
    { name: 'label', weight: 0.45 },
    { name: 'aliases', weight: 0.35 },
    { name: 'key', weight: 0.2 },
  ],
  threshold: 0.5,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 2,
}

/** Confidence threshold — below this we say "no match" */
export const MATCH_THRESHOLD = 0.55

/**
 * Initialize or refresh the Fuse.js index from an array of ISL clips.
 * Defaults to SEED_ISL_CLIPS if no clips passed.
 */
export function initializeClipIndex(clips: ISLClip[] = SEED_ISL_CLIPS) {
  cachedClips = clips
  fuseIndex = new Fuse(clips, FUSE_OPTIONS)
}

// Ensure default index is ready on module load
initializeClipIndex(SEED_ISL_CLIPS)

function cleanQueryString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Conservative multilingual guard: ambiguous negative instructions go to a human interpreter. */
export function hasNegationOrContradiction(query: string): boolean {
  const normalized = (query || '').toLocaleLowerCase().normalize('NFKC').replace(/[’‘]/g, "'")
  // These catalog phrases describe a patient symptom or a clinically useful denial,
  // rather than a negative instruction to perform an action.
  if (/^(?:(?:i )?(?:can'?t|cannot) breathe|no known allerg(?:y|ies)|cant-breathe|no-known-allergy)[.!?]*$/u.test(normalized.trim())) return false
  const tokens = normalized.match(/[\p{L}\p{N}']+/gu) || []
  const negatives = new Set(['not', 'no', 'never', 'without', 'cannot', "can't", 'cant', "don't", 'dont', "doesn't", 'doesnt', "didn't", 'didnt', "won't", 'wont', "shouldn't", 'shouldnt', "mustn't", 'mustnt', 'neither', 'nor', 'nahi', 'nahin', 'nah', 'mat'])
  return tokens.some((token) => negatives.has(token)) || /नहीं|नही|मत/u.test(normalized)
}

/**
 * Search for ISL clips matching a free-text phrase or exact key.
 * Uses a robust 4-tier matching strategy:
 * 1. Exact key / slug match (e.g. 'relax', 'take-medicine')
 * 2. Cleaned phrase exact match on label or aliases (e.g. 'Relax / breathe' -> 'Relax')
 * 3. Multi-word token overlap (e.g. 'We need to do a test', 'Take this medicine')
 * 4. Fuzzy search via Fuse.js with position-independent scoring
 */
export function searchClips(query: string, maxResults = 5): ISLClipMatch[] {
  if (!fuseIndex || cachedClips.length === 0) {
    initializeClipIndex()
  }

  const rawQuery = (query || '').trim()
  if (!rawQuery || hasNegationOrContradiction(rawQuery)) return []

  const cleanQuery = cleanQueryString(rawQuery)
  const querySlug = cleanQuery.replace(/\s+/g, '-')
  const queryWords = cleanQuery.split(' ').filter((w) => w.length > 1)

  const matchedMap = new Map<string, { clip: ISLClip; score: number }>()

  // Tier 1: Direct key match (e.g. 'relax' or 'take-medicine')
  for (const c of cachedClips) {
    if (c.key === rawQuery.toLowerCase() || c.key === querySlug) {
      matchedMap.set(c.key, { clip: c, score: 1.0 })
    }
  }

  // Tier 2: Normalized exact match against label or aliases
  for (const c of cachedClips) {
    if (matchedMap.has(c.key)) continue
    const cleanLabel = cleanQueryString(c.label)
    const cleanAliases = (c.aliases || []).map(cleanQueryString)

    if (cleanLabel === cleanQuery || cleanAliases.includes(cleanQuery)) {
      matchedMap.set(c.key, { clip: c, score: 0.98 })
      continue
    }

    // Check if query exactly equals any alias or label with slashes removed
    for (const alias of cleanAliases) {
      if (cleanQuery.includes(alias) && alias.length >= 4) {
        matchedMap.set(c.key, { clip: c, score: 0.95 })
        break
      }
    }
  }

  // Tier 3: Token word overlap match (handles clinical spoken phrases like "Relax / breathe")
  if (queryWords.length > 0) {
    for (const c of cachedClips) {
      if (matchedMap.has(c.key)) continue

      const clipWords = new Set([
        ...cleanQueryString(c.label).split(' '),
        ...cleanQueryString(c.key).split(' '),
        ...(c.aliases || []).flatMap((a) => cleanQueryString(a).split(' ')),
      ].filter((w) => w.length > 1))

      let matchCount = 0
      for (const qw of queryWords) {
        if (clipWords.has(qw)) matchCount++
      }

      if (matchCount > 0) {
        const ratio = matchCount / queryWords.length
        if (ratio >= 0.5) {
          matchedMap.set(c.key, { clip: c, score: 0.8 + 0.15 * ratio })
        }
      }
    }
  }

  // Tier 4: Fuse.js fuzzy matching fallback
  if (fuseIndex) {
    const fuseResults = fuseIndex.search(cleanQuery || rawQuery, { limit: maxResults * 2 })
    for (const r of fuseResults) {
      if (r.score !== undefined && r.score <= MATCH_THRESHOLD && !matchedMap.has(r.item.key)) {
        matchedMap.set(r.item.key, {
          clip: r.item,
          score: 1 - r.score,
        })
      }
    }
  }

  // Format matches with verified public Supabase Storage URL
  return Array.from(matchedMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((m) => ({
      clip: m.clip,
      score: m.score,
      signedUrl: getClipUrl(m.clip.storage_path || m.clip.key),
    }))
}

/**
 * Get a clip by its exact key slug (e.g. 'chest-pain').
 */
export function getClipByKey(key: string): ISLClip | undefined {
  if (cachedClips.length === 0) {
    initializeClipIndex()
  }
  const cleanKey = key.trim().toLowerCase()
  const slug = cleanKey.replace(/[^a-z0-9]/g, '-')
  return cachedClips.find((c) => c.key === cleanKey || c.key === slug)
}

/**
 * Get all clips, optionally filtered by category.
 */
export function getAllClips(category?: string): ISLClip[] {
  if (cachedClips.length === 0) {
    initializeClipIndex()
  }
  if (category) {
    return cachedClips.filter((c) => c.category === category)
  }
  return cachedClips
}
