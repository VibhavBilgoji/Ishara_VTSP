// Shared TypeScript types for Ishara

// ===== Database row types =====

export type UserRole = 'hospital_staff' | 'doctor' | 'hospital_admin' | 'interpreter'

export type SessionStatus =
  | 'waiting'
  | 'active'
  | 'interpreter_requested'
  | 'interpreter_connected'
  | 'ai_fallback'
  | 'closed'

export type ActiveMode = 'pictogram' | 'ai_fallback' | 'live_interpreter' | 'gesture_ai'

export type EventType =
  | 'pictogram'
  | 'isl_played'
  | 'gesture_text'
  | 'staff_message'
  | 'interpreter_requested'
  | 'interpreter_joined'
  | 'interpreter_left'
  | 'note'

export type InterpreterStatus = 'available' | 'busy' | 'offline'

export type ClipPriority = 'P0' | 'P1' | 'P2'

export interface Hospital {
  id: string
  name: string
  created_at: string
}

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  hospital_id: string | null
  created_at: string
}

/** A nurse-station response to a patient request, sent to the bedside tablet. */
export interface RequestStatusPayload {
  type: 'request_status'
  sessionId: string
  requestEventId: string
  status: 'acknowledged' | 'done'
  label: string
  timestamp: string
}

export interface Session {
  id: string
  hospital_id: string
  patient_display_name: string | null
  bed_label: string
  requested_at: string | null
  status: SessionStatus
  active_mode: ActiveMode | null
  assigned_interpreter_id: string | null
  created_by: string | null
  created_at: string
  closed_at: string | null
}

export interface SessionEvent {
  id: string
  session_id: string
  event_type: EventType
  payload: Record<string, unknown> | null
  actor_id: string | null
  created_at: string
}

export interface ISLClip {
  id: string
  key: string
  label: string
  aliases: string[]
  category: string | null
  priority: ClipPriority | null
  storage_path: string
  duration_seconds: number | null
  created_at: string
}

export interface InterpreterPresence {
  interpreter_id: string
  status: InterpreterStatus
  last_heartbeat: string
  updated_at: string
}

// ===== Realtime event payloads =====

export interface PictogramAlertPayload {
  type: 'pictogram_alert'
  sessionId: string
  patientName?: string
  clipKey: string
  label: string
  category: string
  priority?: ClipPriority
  isUrgent?: boolean
  /** Extra detail chosen on the tablet, e.g. the pain-scale level */
  extraNote?: string
  timestamp: string
}

export interface PlayClipPayload {
  type: 'play_clip'
  sessionId: string
  clipKey: string
  clipUrl: string
  label: string
  timestamp: string
}

export interface InterpreterRequestPayload {
  type: 'new_request'
  sessionId: string
  hospitalName: string
  patientName: string | null
  timestamp: string
}

export interface StatusChangePayload {
  type: 'status_change'
  sessionId: string
  newStatus: SessionStatus
  timestamp: string
}

export interface GestureTextPayload {
  type: 'gesture_text'
  sessionId: string
  text: string
  confidence: number
  timestamp: string
}

// ===== Pictogram grid items =====

export interface PictogramItem {
  key: string
  label: string
  icon: string  // emoji or icon component name
  category: 'emergency' | 'pain' | 'allergy' | 'basic' | 'medical'
  color: string // tailwind color class for the card
  priority: ClipPriority
}

// ===== ISL clip search result =====

export interface ISLClipMatch {
  clip: ISLClip
  score: number
  signedUrl: string
  matchedBy?: 'gemini' | 'fuzzy' | 'exact'
  reasoning?: string
}
