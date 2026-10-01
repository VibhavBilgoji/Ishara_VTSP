import assert from 'node:assert/strict'
import { SEED_ISL_CLIPS } from '../lib/seed-clips'
import { hasNegationOrContradiction, searchClips } from '../lib/isl-clips'
import { matchClipWithGemini } from '../lib/gemini-isl'

// All catalog labels plus selected aliases form a deterministic offline regression set.
const cases = SEED_ISL_CLIPS.flatMap((clip, index) => {
  const alias = clip.aliases.find((candidate) => !SEED_ISL_CLIPS.some((other) =>
    other.key !== clip.key && other.aliases.includes(candidate)))
  return [
    // "My chest hurts" is also an exact alias of the earlier chest-pain entry.
    { query: clip.label, key: clip.key === 'chest-hurts' ? 'chest-pain' : clip.key },
    ...(index < 16 && alias ? [{ query: alias, key: clip.key }] : []),
  ]
}).slice(0, 60)
assert.equal(cases.length, 60, 'offline regression set should cover 60 phrases')

for (const testCase of cases) {
  assert.equal(searchClips(testCase.query, 1)[0]?.clip.key, testCase.key, `offline: ${testCase.query}`)
}

for (const query of [
  "Don't take this medicine", 'Do not move', 'Never give medicine', 'No breathing problem',
  'Dawa mat lo', 'Goli nahi khani', 'dawa nahin lena', 'मत हिलिए', 'दवा नहीं लें',
  "I can't breathe; don't give medicine", 'No known allergy, do not take this medicine',
]) {
  assert.equal(hasNegationOrContradiction(query), true, `negation guard: ${query}`)
  assert.deepEqual(searchClips(query), [], `negation never matches: ${query}`)
}

console.log(`Offline ISL matching: ${cases.length} catalog phrases and 11 negation checks passed.`)

// Live Gemini checks are optional because they require a configured API key and incur API calls.
if (process.env.GEMINI_API_KEY) {
  const liveCases = [
    { query: 'Mere seene mein dard hai', key: 'chest-pain' },
    { query: 'Aapke parivaar se koi yahan hai?', key: 'family-here' },
    { query: 'Paani chahiye', key: 'water' },
    { query: 'Dawa le lo', key: 'take-medicine' },
    { query: 'Aap bilkul mat hiliye', key: null },
    { query: 'Do not take this medicine', key: null },
  ]
  for (const testCase of liveCases) {
    const result = await matchClipWithGemini(testCase.query)
    assert.equal(result?.clip.key ?? null, testCase.key, `Gemini: ${testCase.query}`)
  }
  console.log(`Gemini ISL matching: ${liveCases.length} live phrase checks passed.`)
} else {
  console.log('Gemini checks skipped (GEMINI_API_KEY is not set).')
}
