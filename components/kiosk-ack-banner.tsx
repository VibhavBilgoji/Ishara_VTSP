'use client'

import React from 'react'
import {
  CheckCircle2,
  Clock,
  Eye,
  AlertTriangle,
  Radio,
  Video,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export type KioskAlertStage = 'sending' | 'delivered' | 'seen' | 'unacknowledged'

interface KioskAckBannerProps {
  stage: KioskAlertStage
  alertText: string
  alertHindi?: string | null
  acknowledgedBy?: string | null
  acknowledgedAt?: string | null
  onDismiss: () => void
  onCallInterpreter?: () => void
}

export function KioskAckBanner({
  stage,
  alertText,
  alertHindi,
  acknowledgedBy,
  acknowledgedAt,
  onDismiss,
  onCallInterpreter,
}: KioskAckBannerProps) {
  return (
    <div
      role="status"
      aria-live="assertive"
      className={`
        rounded-2xl p-4 sm:p-5 border-2 transition-all shadow-md animate-in slide-in-from-top-2 duration-200
        ${
          stage === 'seen'
            ? 'bg-emerald-500/10 border-emerald-600 dark:border-emerald-500 text-emerald-950 dark:text-emerald-100'
            : stage === 'unacknowledged'
            ? 'bg-amber-500/10 border-amber-500 text-amber-950 dark:text-amber-100'
            : 'bg-teal-500/10 border-teal-500 text-teal-950 dark:text-teal-100'
        }
      `}
    >
      {/* Top Lifecycle Stepper */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
        <div className="flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm font-bold">
          {/* Step 1: Sent */}
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Sent</span>
          </div>

          <span className="text-muted-foreground">→</span>

          {/* Step 2: Delivered */}
          <div
            className={`flex items-center gap-1 ${
              stage === 'sending'
                ? 'text-muted-foreground opacity-60'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {stage === 'sending' ? (
              <Radio className="w-4 h-4 animate-spin text-teal-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Delivered</span>
          </div>

          <span className="text-muted-foreground">→</span>

          {/* Step 3: Seen by staff */}
          <div
            className={`flex items-center gap-1 ${
              stage === 'seen'
                ? 'text-emerald-700 dark:text-emerald-300 font-extrabold'
                : stage === 'unacknowledged'
                ? 'text-amber-600 dark:text-amber-400 font-bold animate-pulse'
                : 'text-muted-foreground opacity-60'
            }`}
          >
            {stage === 'seen' ? (
              <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : stage === 'unacknowledged' ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            <span>
              {stage === 'seen'
                ? 'Seen by Staff ✓'
                : stage === 'unacknowledged'
                ? 'Awaiting Staff'
                : 'Waiting for Staff'}
            </span>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Alert Message */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight">
            &ldquo;{alertText}&rdquo; {alertHindi && <span lang="hi">({alertHindi})</span>}
          </h3>

          <div className="mt-1 text-xs sm:text-sm">
            {stage === 'seen' ? (
              <p className="text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                <span>👁️ Doctor / Nurse acknowledged:</span>
                <strong>{acknowledgedBy || 'Clinical Staff'}</strong>
                {acknowledgedAt && (
                  <span className="text-xs opacity-75">at {acknowledgedAt}</span>
                )}
              </p>
            ) : stage === 'unacknowledged' ? (
              <p className="text-amber-800 dark:text-amber-300 font-medium">
                ⚠️ Staff station has not acknowledged yet. If acute distress, please call the live interpreter immediately.
              </p>
            ) : (
              <p className="text-teal-800 dark:text-teal-300 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping inline-block" />
                <span>Delivered to ward station. Waiting for doctor to view...</span>
              </p>
            )}
          </div>
        </div>

        {stage === 'unacknowledged' && onCallInterpreter && (
          <Button
            size="sm"
            onClick={onCallInterpreter}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl shrink-0 flex items-center gap-1.5 shadow-sm"
          >
            <Video className="w-4 h-4" />
            <span>Call Interpreter Now</span>
          </Button>
        )}
      </div>
    </div>
  )
}
