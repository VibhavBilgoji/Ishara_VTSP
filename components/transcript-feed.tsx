'use client'

import React, { useState, useMemo } from 'react'
import type { SessionEvent } from '@/lib/types'
import type { GestureTextPayload } from '@/hooks/use-session-realtime'
import {
  AlertCircle,
  Video,
  PlayCircle,
  MessageSquare,
  Clock,
  Sparkles,
  ShieldAlert,
  Filter,
  CheckCircle2,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TranscriptFeedProps {
  events: SessionEvent[]
  initialFilterSevere?: boolean
  onClearEvents?: () => void
}

// ─── Severe & Critical Filter Helper ──────────────────────────────────────────

const SEVERE_KEYWORDS = [
  'chest pain',
  'chest ache',
  'chest',
  'heart',
  'cardiac',
  'headache',
  'head pain',
  'head hurts',
  'migraine',
  'breathe',
  'breathing',
  'cant breathe',
  "can't breathe",
  'choking',
  'shortness of breath',
  'suffocating',
  'respiratory',
  'pain',
  'severe',
  'emergency',
  'call doctor',
  'allergy',
  'allergic',
  'dizzy',
  'dizziness',
  'faint',
  'unconscious',
  'seizure',
  'bleeding',
  'blood',
  'hemorrhage',
  'vomit',
  'vomiting',
  'stomach pain',
  'stomach hurts',
  'back pain',
  'back hurts',
  'anxiety',
  'panic',
]

export function isSevereOrCriticalEvent(evt: SessionEvent): boolean {
  const payload = (evt.payload as Record<string, any>) || {}

  // 1. Explicit urgent / priority flags
  if (payload.isUrgent === true || payload.priority === 'P0') {
    return true
  }

  // 2. Emergency alert type or urgent event
  if ((evt.event_type as string) === 'emergency_alert') {
    return true
  }

  // 3. Category matching emergency, acute pain, or allergy
  const cat = (payload.category || '').toLowerCase()
  if (cat === 'emergency' || cat === 'pain' || cat === 'allergy') {
    return true
  }

  // 4. Keywords matching severe/extreme health conditions in text, label, note, or clipKey
  const textContent = [
    payload.text,
    payload.sign,
    payload.label,
    payload.clipKey,
    payload.extraNote,
    payload.message,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (SEVERE_KEYWORDS.some((keyword) => textContent.includes(keyword))) {
    return true
  }

  // Routine events (water, blanket, toilet, doctor replies like "you are safe") are filtered out
  return false
}

// ─── Gesture text sub-component ──────────────────────────────────────────────

function GestureTextEntry({ payload }: { payload: GestureTextPayload }) {
  const confidencePct = Math.round(payload.confidence * 100)
  const time = new Date(payload.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="p-3.5 rounded-xl border-l-4 border-l-purple-600 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 flex items-start justify-between gap-2 shadow-sm">
      <div className="flex items-start gap-2.5">
        <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-1.5 py-0.5 rounded flex items-center gap-1">
              🤟 AI Severe Sign
            </span>
            <span className="text-xs text-slate-500">{time}</span>
          </div>
          <div className="font-extrabold text-base text-slate-900 dark:text-white mt-0.5">
            &ldquo;{payload.text}&rdquo;
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40">
              {confidencePct}% confidence
            </span>
            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              Critical Health Event
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TranscriptFeed({
  events,
  initialFilterSevere = true,
  onClearEvents,
}: TranscriptFeedProps) {
  const [filterSevereOnly, setFilterSevereOnly] = useState(initialFilterSevere)
  const [confirmClear, setConfirmClear] = useState(false)

  const displayedEvents = useMemo(() => {
    if (!filterSevereOnly) return events
    return events.filter(isSevereOrCriticalEvent)
  }, [events, filterSevereOnly])

  const severeCount = useMemo(() => {
    return events.filter(isSevereOrCriticalEvent).length
  }, [events])

  if (events.length === 0) {
    return (
      <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
        <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          No audit events in this session yet
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Severe clinical symptoms and emergency triage alerts will appear here in real time.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Triage Filter Bar */}
      <div className="flex items-center justify-between px-1 pb-1 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 shrink-0">
            <ShieldAlert className="w-3 h-3" />
            {filterSevereOnly ? 'Severe & Critical Filter Active' : 'Showing All Audit Events'}
          </span>
          {filterSevereOnly && events.length > severeCount && (
            <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
              ({events.length - severeCount} basic events filtered)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFilterSevereOnly(!filterSevereOnly)}
            className="h-6 px-2 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <Filter className="w-3 h-3 mr-1" />
            {filterSevereOnly ? 'Show All' : 'Critical Only'}
          </Button>

          {onClearEvents && events.length > 0 && (
            confirmClear ? (
              <div className="flex items-center gap-1 animate-in fade-in duration-150">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setConfirmClear(false)
                    onClearEvents()
                  }}
                  className="h-6 px-2 text-[11px] font-bold bg-red-600 hover:bg-red-700 text-white rounded-md shadow-xs"
                >
                  Hide Earlier
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmClear(false)}
                  className="h-6 px-1.5 text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmClear(true)}
                className="h-6 px-2 text-[11px] font-semibold text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md flex items-center gap-1 transition-colors"
                title="Hide earlier interactions from this view"
              >
                <Trash2 className="w-3 h-3" />
                <span>Hide Earlier</span>
              </Button>
            )
          )}
        </div>
      </div>

      {displayedEvents.length === 0 ? (
        <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            No Severe or Critical Health Cases
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Routine patient requests and staff ISL replies can be viewed by selecting &apos;Show All&apos; above.
          </p>
        </div>
      ) : (
        displayedEvents.map((evt) => {
          const payload = (evt.payload as Record<string, any>) || {}
          const time = evt.created_at ? new Date(evt.created_at).toLocaleTimeString() : ''

          switch (evt.event_type as string) {
            case 'pictogram':
            case 'emergency_alert':
              return (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-xl border-l-4 border-l-red-600 bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 flex items-start justify-between gap-2 shadow-sm"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/60 px-1.5 py-0.5 rounded">
                          Critical Patient Alert
                        </span>
                        <span className="text-xs text-slate-500">{time}</span>
                      </div>
                      <div className="font-extrabold text-base text-slate-900 dark:text-white mt-0.5">
                        {payload.label || payload.clipKey || 'Emergency Alert'}
                      </div>
                      {payload.extraNote && (
                        <p className="text-xs font-semibold text-red-800 dark:text-red-200 mt-0.5">
                          {payload.extraNote}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )

            case 'gesture_text':
              return (
                <GestureTextEntry
                  key={evt.id}
                  payload={evt.payload as unknown as GestureTextPayload}
                />
              )

            case 'isl_played':
              return (
                <div
                  key={evt.id}
                  className="p-3.5 rounded-xl border-l-4 border-l-teal-600 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/40 flex items-start justify-between gap-2 shadow-sm"
                >
                  <div className="flex items-start gap-2.5">
                    <PlayCircle className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-1.5 py-0.5 rounded">
                          ISL Clip Dispatched
                        </span>
                        <span className="text-xs text-slate-500">{time}</span>
                      </div>
                      <div className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
                        &ldquo;{payload.label || payload.clipKey}&rdquo;
                      </div>
                    </div>
                  </div>
                </div>
              )

            case 'interpreter_requested':
            case 'interpreter_joined':
            case 'interpreter_left':
              return (
                <div
                  key={evt.id}
                  className="p-3 rounded-xl border-l-4 border-l-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <Video className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-indigo-800 dark:text-indigo-200">
                        {evt.event_type === 'interpreter_requested' && 'Remote ISL Interpreter Requested'}
                        {evt.event_type === 'interpreter_joined' && 'Interpreter Connected via WebRTC'}
                        {evt.event_type === 'interpreter_left' && 'Interpreter Left Session'}
                      </span>
                      {payload.message && (
                        <p className="text-xs text-slate-600 dark:text-slate-300">{payload.message}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">{time}</span>
                </div>
              )

            default:
              return (
                <div
                  key={evt.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    <span>{payload.message || JSON.stringify(payload)}</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">{time}</span>
                </div>
              )
          }
        })
      )}
    </div>
  )
}
