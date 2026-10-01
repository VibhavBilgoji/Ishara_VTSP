'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { PictogramGrid } from '@/components/pictogram-grid'
import { ISLVideoPlayer } from '@/components/isl-video-player'
import { LiveKitVideoCall } from '@/components/livekit-video-call'
import { VisionGestureCamera } from '@/components/vision-gesture-camera'
import { useSessionRealtime } from '@/hooks/use-session-realtime'
import { getClipUrl } from '@/lib/isl-clips'
import type { DetailedPictogram } from '@/lib/pictograms'
import { KioskAckBanner, type KioskAlertStage } from '@/components/kiosk-ack-banner'
import {
  Video,
  Shield,
  X,
  Sparkles,
  PhoneOff,
  Hand,
  HeartHandshake,
  Maximize,
  Minimize,
  Type,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// ─── Patient kiosk page ────────────────────────────────────────────────────────────

export default function PatientPage() {
  const params = useParams<{ sessionId: string }>()
  const sessionId = params.sessionId || '00000000-0000-0000-0000-000000000001'

  const [lastAlertText, setLastAlertText] = useState<string | null>(null)
  const [lastAlertHindi, setLastAlertHindi] = useState<string | null>(null)
  const [alertStage, setAlertStage] = useState<KioskAlertStage | null>(null)
  const [acknowledgedBy, setAcknowledgedBy] = useState<string | null>(null)
  const [acknowledgedAt, setAcknowledgedAt] = useState<string | null>(null)
  const [bedName, setBedName] = useState('Bedside Kiosk (ISL)')
  const [hospitalName, setHospitalName] = useState('Hospital')
  const [fallbackCountdown, setFallbackCountdown] = useState<number>(30)
  const [largeText, setLargeText] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [wakeLockActive, setWakeLockActive] = useState(false)
  const ackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Screen Wake Lock API to prevent bedside tablet from dimming/sleeping
  useEffect(() => {
    let wakeLock: any = null

    const requestWakeLock = async () => {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen')
          setWakeLockActive(true)
          wakeLock.addEventListener('release', () => setWakeLockActive(false))
        } catch {
          // Wake lock rejected or battery saver active
        }
      }
    }

    requestWakeLock()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (wakeLock) {
        try { wakeLock.release() } catch {}
      }
      document.removeEventListener('visibilitychange', handleVisibility)
      if (ackTimeoutRef.current) clearTimeout(ackTimeoutRef.current)
    }
  }, [])

  const toggleFullscreen = () => {
    if (typeof document === 'undefined') return
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    fetch(`/api/session?id=${encodeURIComponent(sessionId)}`)
      .then((res) => (res.ok && res.headers.get('content-type')?.includes('application/json') ? res.json() : null))
      .then((data) => {
        if (data?.session?.patient_display_name) {
          setBedName(data.session.patient_display_name)
          setHospitalName(data.hospital?.name || 'Hospital')
        }
      })
      .catch(() => {})
  }, [sessionId])

  const handleAlertAckReceived = useCallback((ack: any) => {
    if (ackTimeoutRef.current) clearTimeout(ackTimeoutRef.current)
    setAlertStage('seen')
    setAcknowledgedBy(ack.acknowledgedBy || 'Doctor / Staff')
    setAcknowledgedAt(
      new Date(ack.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    )
    toast.success(`Seen by ${ack.acknowledgedBy || 'staff'} • डॉक्टर द्वारा देखा गया`)
  }, [])

  const {
    activeClip,
    sessionStatus,
    sendPictogramAlert,
    clearClip,
    sendStatusChange,
    requestInterpreter,
    sendGestureText,
    cancelInterpreterRequest,
  } = useSessionRealtime({
    sessionId,
    onAlertAck: handleAlertAckReceived,
  })

  // Auto-fallback countdown when live interpreter is paged (falls back to P3 AI Sign Interpreter if unreached)
  useEffect(() => {
    if (sessionStatus !== 'interpreter_requested') {
      setFallbackCountdown(30)
      return
    }

    const timer = setInterval(() => {
      setFallbackCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          sendStatusChange('ai_fallback')
          toast.warning('Live interpreter unavailable within 30s. Switched to AI Assisted Sign Interpreter (P3).')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [sessionStatus, sendStatusChange])

  const handleCancelInterpreter = () => {
    cancelInterpreterRequest()
    toast.info('Interpreter request cancelled / अनुरोध रद्द किया गया')
  }

  const handleTriggerAlert = (pictogram: DetailedPictogram, extraNote?: string) => {
    const isUrgent = pictogram.priority === 'P0'
    const fullNote = extraNote ? `${pictogram.label} (${extraNote})` : pictogram.label

    // Set initial Sending state
    setLastAlertText(fullNote)
    setLastAlertHindi(
      pictogram.hindiText || (isUrgent ? 'डॉक्टर को तुरंत सूचित किया गया' : 'नर्सिंग स्टेशन को सूचित किया गया')
    )
    setAlertStage('sending')
    setAcknowledgedBy(null)
    setAcknowledgedAt(null)

    // 1. Send alert via Realtime broadcast
    sendPictogramAlert(
      pictogram.key,
      pictogram.label,
      pictogram.category,
      pictogram.priority,
      isUrgent,
      bedName
    )

    // Transition to Delivered
    setTimeout(() => {
      setAlertStage((prev) => (prev === 'sending' ? 'delivered' : prev))
    }, 300)

    // If unacknowledged after 8 seconds, transition to unacknowledged warning
    if (ackTimeoutRef.current) clearTimeout(ackTimeoutRef.current)
    ackTimeoutRef.current = setTimeout(() => {
      setAlertStage((curr) => (curr === 'delivered' ? 'unacknowledged' : curr))
    }, 8000)

    if (isUrgent) {
      toast.error(`Urgent Alert Sent: ${fullNote} • डॉक्टर को तुरंत सूचित किया गया`)
    } else {
      toast.success(`Request Sent: ${fullNote} • सूचित किया गया`)
    }
  }

  const handleRequestInterpreter = async () => {
    try {
      await requestInterpreter({
        hospitalName,
        patientName: bedName,
        note: 'Bedside request from patient tablet',
      })
      toast.info('Paging ISL interpreter relay pool...')
      setFallbackCountdown(30)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not page an interpreter. Please retry.')
    }
  }

  const handleDisconnectInterpreter = async () => {
    toast.info('Live video call disconnected / वीडियो कॉल समाप्त किया गया')
    sendStatusChange('active')
    try {
      await fetch(`/api/session/${sessionId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'active',
          activeMode: 'pictogram',
        }),
      })
    } catch {}
  }

  // When live interpreter is connected, provide an immersive full-screen video call
  // stage (matching interpreter portal layout) without small letterboxing or distractions
  if (sessionStatus === 'interpreter_connected') {
    return (
      <main className="h-screen w-screen bg-[#0B1517] text-white flex flex-col overflow-hidden p-2 sm:p-4">
        {/* Top Header for Patient Live Video Call */}
        <header className="flex items-center justify-between pb-2 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnectInterpreter}
              className="bg-emergency border-emergency text-white hover:bg-emergency/90 hover:text-white text-base font-semibold flex items-center gap-2 rounded-xl h-12 px-4 transition-colors"
            >
              <PhoneOff className="w-5 h-5" />
              <span>End call / <span lang="hi">समाप्त करें</span></span>
            </Button>

            <div className="flex items-center gap-2">
              <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-lg overflow-hidden bg-teal-500/20 flex items-center justify-center shrink-0">
                <Image
                  src="/logo-mark-white.png"
                  alt="Ishara Logo"
                  fill
                  sizes="28px"
                  className="object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold text-teal-300">
                    Ishara Live Relay Room
                  </h1>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50 animate-pulse">
                    LIVE ISL
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden md:block">
                  Connected to Certified ISL Video Interpreter • सांकेतिक भाषा अनुवादक जुड़ा हुआ है
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-950/80 text-indigo-200 border border-indigo-700/50 font-mono">
              {bedName}
            </span>
            <span className="text-xs font-mono text-slate-400 hidden sm:inline">
              Session: <span className="text-white font-bold">{sessionId.slice(0, 8)}...</span>
            </span>
          </div>
        </header>

        {/* Real LiveKit WebRTC Video Room taking full remaining viewport */}
        <div className="flex-1 w-full h-full min-h-0 overflow-hidden">
          <LiveKitVideoCall
            roomName={sessionId}
            participantName={bedName || 'Patient'}
            participantIdentity={`patient-${sessionId.slice(0, 6)}`}
            role="patient"
            onDisconnect={handleDisconnectInterpreter}
          />
        </div>

        {/* ISL Video Player Modal (Triggered automatically if clip received during call) */}
        {activeClip && (
          <ISLVideoPlayer
            clipKey={activeClip.clipKey}
            clipLabel={activeClip.label}
            videoUrl={
              activeClip.clipUrl && activeClip.clipUrl.startsWith('http')
                ? activeClip.clipUrl
                : getClipUrl(activeClip.clipKey)
            }
            onClose={clearClip}
          />
        )}
      </main>
    )
  }

  return (
    <main className="patient-view min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-7 min-h-[76px] py-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
          <div className="flex items-center gap-3">
            <span className="relative w-10 h-10 rounded-xl border border-border bg-white overflow-hidden shrink-0">
              <Image src="/logo-mark.png" alt="" fill sizes="40px" className="object-contain p-1" priority />
            </span>
            <span className="font-heading font-bold text-2xl sm:text-[28px] tracking-tight">{bedName}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span role="status" className="flex items-center gap-2 text-sm sm:text-base font-semibold text-success-ink mr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-success shrink-0 animate-pulse" />
              <span>Care Team Connected</span>
            </span>

            {wakeLockActive && (
              <span
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-500/20"
                title="Screen wake lock is active — tablet will not dim or sleep"
              >
                <Lock className="w-3 h-3" />
                <span>Screen Locked On</span>
              </span>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setLargeText(!largeText)}
              className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                largeText ? 'bg-primary text-primary-foreground border-primary' : 'border-border'
              }`}
              title={largeText ? 'Switch to normal text size' : 'Switch to large text mode for accessibility'}
            >
              <Type className="w-3.5 h-3.5" />
              <span>{largeText ? 'Text: Large' : 'Large Text'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-border"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter immersive kiosk fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className={`flex-1 max-w-[1280px] w-full mx-auto p-4 sm:px-7 sm:py-5 grid lg:grid-cols-[420px_minmax(0,1fr)] gap-6 items-start ${largeText ? 'text-lg' : ''}`}>
        {/* ───── Left: interpreter + sign camera ───── */}
        <div className="flex flex-col gap-3.5 lg:sticky lg:top-[96px]">
          {sessionStatus === 'interpreter_requested' ? (
            <div role="status" className="rounded-[22px] bg-indigo-surface border-2 border-indigo p-5 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="w-14 h-14 shrink-0 rounded-full bg-indigo text-white flex items-center justify-center">
                  <Video className="w-6 h-6" />
                </span>
                <div className="flex-1">
                  <span className="block text-lg font-bold text-indigo-ink">Calling an interpreter…</span>
                  <span lang="hi" className="block text-[15px] text-indigo-ink/85">अनुवादक को बुलाया जा रहा है</span>
                </div>
                <span className="font-heading font-bold text-3xl text-indigo-ink tabular-nums">{fallbackCountdown}s</span>
              </div>
              <p className="text-base text-foreground">Please stay in front of this screen. Video starts by itself.</p>
              <Button
                variant="outline"
                onClick={handleCancelInterpreter}
                className="h-14 rounded-2xl bg-card border-input text-base font-semibold gap-2"
              >
                <X className="w-5 h-5" /> Cancel / <span lang="hi">रद्द करें</span>
              </Button>
            </div>
          ) : sessionStatus === 'ai_fallback' ? (
            <div role="status" className="rounded-[22px] bg-teal-surface border-2 border-teal p-5 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="w-14 h-14 shrink-0 rounded-full bg-teal text-white flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </span>
                <div>
                  <span className="block text-lg font-bold text-teal-ink">Interpreter busy — sign to the camera</span>
                  <span lang="hi" className="block text-[15px] text-teal-ink/85">कैमरे के सामने इशारा करें</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  onClick={handleRequestInterpreter}
                  className="h-14 rounded-2xl bg-indigo hover:bg-indigo-hover text-white text-base font-semibold"
                >
                  Try again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => sendStatusChange('active')}
                  className="h-14 rounded-2xl bg-card border-input text-base font-semibold"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRequestInterpreter}
              className="min-h-[76px] rounded-[18px] bg-indigo hover:bg-indigo-hover text-white flex items-center justify-center gap-3.5 px-5 transition-colors active:scale-[0.98]"
            >
              <Video className="w-7 h-7 shrink-0" />
              <span className="flex flex-col items-start leading-tight">
                <span className="text-xl font-bold">Call live interpreter</span>
                <span lang="hi" className="text-[15px] opacity-90">अनुवादक बुलाएं</span>
              </span>
            </button>
          )}

          <section
            aria-label="Sign to the camera"
            className="rounded-[22px] bg-card border border-border p-4 sm:p-5 flex flex-col gap-3"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-teal-surface text-teal-ink flex items-center justify-center">
                <Hand className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold">
                Sign to the camera <span lang="hi" className="font-medium text-base text-muted-foreground">/ कैमरे से इशारा करें</span>
              </h2>
            </div>
            <VisionGestureCamera sendGestureText={sendGestureText} className="w-full" />
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" /> Video stays on this tablet
            </span>
          </section>

          <section aria-label="Reassurance" className="rounded-[22px] bg-teal-surface p-5 flex gap-4 items-start">
            <span className="w-11 h-11 shrink-0 rounded-full bg-teal text-white flex items-center justify-center">
              <HeartHandshake className="w-5 h-5" />
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-lg font-bold text-teal-ink">You are safe. Staff are nearby.</span>
              <span lang="hi" className="text-[15px] font-medium text-teal-ink/85">आप सुरक्षित हैं। स्टाफ़ पास में है।</span>
              <span className="text-[15px] text-secondary-foreground mt-1">
                Tap a card and a nurse sees it straight away. Their reply appears on this screen in sign language.
              </span>
            </div>
          </section>
        </div>

        {/* ───── Right: confirmations + pictograms ───── */}
        <div className="flex flex-col gap-4 min-w-0">
          {alertStage && lastAlertText && (
            <KioskAckBanner
              stage={alertStage}
              alertText={lastAlertText}
              alertHindi={lastAlertHindi}
              acknowledgedBy={acknowledgedBy}
              acknowledgedAt={acknowledgedAt}
              onDismiss={() => setAlertStage(null)}
              onCallInterpreter={handleRequestInterpreter}
            />
          )}

          <div className="flex flex-col gap-2">
            <PictogramGrid onTriggerAlert={handleTriggerAlert} />
          </div>
        </div>
      </div>

      {/* ISL Video Player Modal (Triggered automatically when clip received) */}
      {activeClip && (
        <ISLVideoPlayer
          clipKey={activeClip.clipKey}
          clipLabel={activeClip.label}
          videoUrl={
            activeClip.clipUrl && activeClip.clipUrl.startsWith('http')
              ? activeClip.clipUrl
              : getClipUrl(activeClip.clipKey)
          }
          onClose={clearClip}
        />
      )}
    </main>
  )
}
