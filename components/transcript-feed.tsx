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
  ShieldAlert,
  Filter,
  CheckCircle2,
  Trash2,
  Hand,
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
    <div className="flex gap-3 max-w-[560px]">
      <span className="w-8 h-8 shrink-0 rounded-full bg-teal-surface text-teal-ink flex items-center justify-center">
        <Hand className="w-4 h-4" />
      </span>
      <div className="flex flex-col gap-1 px-3.5 py-3 rounded-[4px_14px_14px_14px] bg-background">
        <span className="text-xs font-bold tracking-[0.04em] text-muted-foreground">
          PATIENT · SIGNED · <span className="tabular-nums">{time}</span>
        </span>
        <span className="text-base font-semibold text-foreground">
          &ldquo;{payload.text}&rdquo;{' '}
          <span className="font-medium text-muted-foreground">· {confidencePct}% confidence, on-device</span>
        </span>
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
      <div className="text-center py-12 px-4 border-2 border-dashed border-border rounded-2xl">
        <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Nothing has been said yet
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Patient taps, signs and your ISL replies appear here in real time.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3.5">
      {/* Triage Filter Bar */}
      <div className="flex items-center justify-between px-1 pb-1 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-secondary-foreground shrink-0">
            <ShieldAlert className="w-3 h-3" />
            {filterSevereOnly ? 'Severe & critical only' : 'All events'}
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
            {filterSevereOnly ? 'Show all' : 'Critical only'}
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
                  Hide earlier
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
                <span>Hide earlier</span>
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
                <div key={evt.id} className="flex gap-3 max-w-[560px]">
                  <span className="w-8 h-8 shrink-0 rounded-full bg-emergency-surface text-emergency-ink flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </span>
                  <div className="flex flex-col gap-1 px-3.5 py-3 rounded-[4px_14px_14px_14px] bg-emergency-surface/60 border border-emergency/30">
                    <span className="text-xs font-bold tracking-[0.04em] text-emergency-ink">
                      PATIENT · URGENT · <span className="tabular-nums">{time}</span>
                    </span>
                    <span className="text-base font-semibold text-foreground">
                      {payload.label || payload.clipKey || 'Emergency alert'}
                    </span>
                    {payload.extraNote && (
                      <span className="text-sm text-emergency-ink">{payload.extraNote}</span>
                    )}
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
                <div key={evt.id} className="flex flex-row-reverse gap-3 max-w-[560px] self-end ml-auto">
                  <span className="w-8 h-8 shrink-0 rounded-full bg-teal text-white flex items-center justify-center">
                    <PlayCircle className="w-4 h-4" />
                  </span>
                  <div className="flex flex-col gap-1 px-3.5 py-3 rounded-[14px_4px_14px_14px] bg-teal-surface">
                    <span className="text-xs font-bold tracking-[0.04em] text-teal-ink">
                      STAFF · ISL CLIP PLAYED · <span className="tabular-nums">{time}</span>
                    </span>
                    <span className="text-base text-foreground">&ldquo;{payload.label || payload.clipKey}&rdquo;</span>
                  </div>
                </div>
              )

            case 'interpreter_requested':
            case 'interpreter_joined':
            case 'interpreter_left':
              return (
                <div key={evt.id} className="flex items-center gap-3 text-[13px] text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  <span className="flex items-center gap-1.5 font-semibold text-indigo-ink">
                    <Video className="w-3.5 h-3.5" />
                    {evt.event_type === 'interpreter_requested' && 'Interpreter requested'}
                    {evt.event_type === 'interpreter_joined' && 'Interpreter joined by video'}
                    {evt.event_type === 'interpreter_left' && 'Interpreter left'}
                  </span>
                  <span className="tabular-nums">{time}</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              )

            default:
              return (
                <div key={evt.id} className="flex gap-3 max-w-[560px]">
                  <span className="w-8 h-8 shrink-0 rounded-full bg-muted text-secondary-foreground flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </span>
                  <div className="flex flex-col gap-1 px-3.5 py-3 rounded-[4px_14px_14px_14px] bg-background">
                    <span className="text-xs font-bold tracking-[0.04em] text-muted-foreground">
                      PATIENT · <span className="tabular-nums">{time}</span>
                    </span>
                    <span className="text-base font-semibold text-foreground">
                      {payload.label || payload.message || JSON.stringify(payload)}
                    </span>
                  </div>
                </div>
              )
          }
        })
      )}
    </div>
  )
}
