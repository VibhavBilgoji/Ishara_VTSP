'use client'

import React, { useEffect } from 'react'
import { AlertCircle, CheckCircle2, Video, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PictogramAlertPayload } from '@/lib/types'

interface EmergencyAlertBannerProps {
  alert: PictogramAlertPayload | null
  patientDisplayName?: string
  onAcknowledge: () => void
  onRequestInterpreter?: () => void
  onOpenConsole?: (sessionId: string) => void
}

import { playClinicalChime } from '@/lib/alarm-audio'

export function EmergencyAlertBanner({
  alert,
  patientDisplayName,
  onAcknowledge,
  onRequestInterpreter,
  onOpenConsole,
}: EmergencyAlertBannerProps) {
  useEffect(() => {
    if (alert) {
      playClinicalChime(patientDisplayName || alert.patientName)
    }
  }, [alert, patientDisplayName])

  if (!alert) return null

  const isCritical = alert.category?.toLowerCase().includes('emergency') || alert.clipKey.includes('pain') || alert.clipKey.includes('breathe')
  const bedInfo = patientDisplayName || alert.patientName

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`w-full rounded-2xl border-2 p-4 sm:p-5 flex flex-wrap items-center gap-4 ${
        isCritical
          ? 'bg-emergency-surface border-emergency text-emergency-ink'
          : 'bg-warning-surface border-warning text-warning-ink'
      }`}
    >
      <span
        className={`w-12 h-12 shrink-0 rounded-full text-white flex items-center justify-center motion-safe:animate-pulse ${
          isCritical ? 'bg-emergency' : 'bg-amber-700'
        }`}
      >
        <AlertCircle className="w-6 h-6" />
      </span>

      <div className="flex-[1_1_240px] min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-[0.06em]">
          <span>{isCritical ? 'P0 · URGENT' : 'NEEDS ATTENTION'}</span>
          <span className="font-medium tracking-normal opacity-80 tabular-nums">
            {new Date(alert.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <h3 className="font-heading font-bold text-xl text-foreground">
          {bedInfo ? `${bedInfo} — ${alert.label}` : alert.label}
        </h3>
        <p className="text-sm">
          {bedInfo ? 'Tapped on the bedside tablet · chime playing on staff screens' : 'Patient tapped an urgent pictogram on the bedside tablet'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onOpenConsole && (
          <Button
            onClick={() => onOpenConsole(alert.sessionId)}
            className="h-12 px-4 rounded-[10px] bg-card text-foreground border border-border hover:bg-muted font-semibold gap-1.5"
          >
            <ExternalLink className="w-4 h-4" />
            Open bed console
          </Button>
        )}
        {onRequestInterpreter && (
          <Button
            onClick={onRequestInterpreter}
            className="h-12 px-4 rounded-[10px] bg-indigo hover:bg-indigo-hover text-white font-semibold gap-1.5"
          >
            <Video className="w-4 h-4" />
            Page interpreter
          </Button>
        )}
        <Button
          onClick={onAcknowledge}
          className={`h-12 px-5 rounded-[10px] text-white font-bold gap-1.5 ${
            isCritical ? 'bg-emergency hover:bg-emergency/90' : 'bg-amber-700 hover:bg-amber-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Acknowledge
        </Button>
      </div>
    </div>
  )
}
