'use client'

import React, { useState, useEffect } from 'react'
import { BellRing, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  isAudioUnlocked,
  unlockAlarmsAndNotifications,
  getSharedAudioContext,
} from '@/lib/alarm-audio'

interface AudioAlarmBannerProps {
  className?: string
}

export function AudioAlarmBanner({ className = '' }: AudioAlarmBannerProps) {
  const [unlocked, setUnlocked] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkState = () => {
      const audioActive = isAudioUnlocked()
      const notif = typeof Notification !== 'undefined' ? Notification.permission : 'denied'
      setUnlocked(audioActive && notif === 'granted')
    }

    checkState()

    // Listen to user interactions anywhere on the page to auto-resume AudioContext
    const onUserGesture = () => {
      const ctx = getSharedAudioContext()
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          checkState()
        }).catch(() => {})
      }
    }

    window.addEventListener('click', onUserGesture, { once: true, passive: true })
    window.addEventListener('keydown', onUserGesture, { once: true, passive: true })

    return () => {
      window.removeEventListener('click', onUserGesture)
      window.removeEventListener('keydown', onUserGesture)
    }
  }, [])

  const handleEnableAlarms = async () => {
    const res = await unlockAlarmsAndNotifications()
    setUnlocked(res.audioUnlocked && res.notificationStatus === 'granted')

    // Play a gentle confirmation blip
    const ctx = getSharedAudioContext()
    if (ctx && ctx.state === 'running') {
      try {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.frequency.setValueAtTime(659.25, ctx.currentTime)
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.15)
      } catch {}
    }
  }

  if (dismissed || unlocked) return null

  return (
    <div
      className={`w-full py-2 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 text-xs ${className}`}
      role="status"
    >
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
        <span>
          <strong>Emergency alarms and background chimes are paused</strong> by browser autoplay policies.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={handleEnableAlarms}
          className="h-7 px-3 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs"
        >
          <BellRing className="w-3.5 h-3.5" />
          <span>Enable Alarms</span>
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-700 dark:text-amber-400 hover:text-amber-900 text-xs px-1"
          aria-label="Dismiss banner"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
