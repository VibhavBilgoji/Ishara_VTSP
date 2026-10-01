import { EMERGENCY_P0_PICTOGRAMS, ALL_CATEGORY_PICTOGRAMS } from '@/lib/pictograms'

/** Statuses a nurse can set on a patient request. */
export const REQUEST_STATUSES = ['acknowledged', 'done'] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

/** One patient request as shown on the nurse station. */
export interface NurseRequest {
  id: string
  sessionId: string
  bedLabel: string
  patientName: string | null
  source: 'tap' | 'sign'
  label: string
  hindi: string | null
  detail: string | null
  isUrgent: boolean
  createdAt: string
  status: 'new' | RequestStatus
  statusAt: string | null
}

/** Event types that count as something the patient asked for. */
export const REQUEST_EVENT_TYPES = ['pictogram', 'gesture_text'] as const

/** Note payload marker used to record a nurse response in the audit log. */
export const REQUEST_STATUS_NOTE_KIND = 'request_status'

const ALL_PICTOGRAMS = [...EMERGENCY_P0_PICTOGRAMS, ...Object.values(ALL_CATEGORY_PICTOGRAMS).flat()]

export function hindiForPictogram(clipKey: unknown): string | null {
  if (typeof clipKey !== 'string') return null
  return ALL_PICTOGRAMS.find((p) => p.key === clipKey)?.hindiText ?? null
}

// Signed words that should jump the queue, mirroring the console's severity rules
const URGENT_SIGN_WORDS = ['pain', 'emergency', 'help', 'breath', 'chest', 'bleed', 'allerg', 'dizzy', 'faint', 'vomit']

export function isUrgentSign(text: unknown): boolean {
  if (typeof text !== 'string') return false
  const lower = text.toLowerCase()
  return URGENT_SIGN_WORDS.some((word) => lower.includes(word))
}
