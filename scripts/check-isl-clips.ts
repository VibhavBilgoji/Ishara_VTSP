import { createServiceClient } from '../lib/supabase/service'
import { SEED_ISL_CLIPS } from '../lib/seed-clips'
import { resolveStorageFilename } from '../lib/isl-clips'

const supabase = createServiceClient()
const expected = new Set(SEED_ISL_CLIPS.map((clip) => resolveStorageFilename(clip.storage_path)))
const found = new Set<string>()
let offset = 0

while (true) {
  const { data, error } = await supabase.storage.from('isl-clips').list('', { limit: 1000, offset })
  if (error) throw new Error(`Unable to list isl-clips bucket: ${error.message}`)
  for (const entry of data) found.add(entry.name)
  if (data.length < 1000) break
  offset += data.length
}

const missing = [...expected].filter((filename) => !found.has(filename))
if (missing.length) {
  console.error(`Missing ${missing.length} of ${expected.size} expected ISL videos:\n${missing.join('\n')}`)
  process.exitCode = 1
} else {
  console.log(`All ${expected.size} ISL video files exist in the isl-clips bucket.`)
}
