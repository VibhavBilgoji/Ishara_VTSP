'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { PictogramGrid } from '@/components/pictogram-grid'
import { ISLVideoPlayer } from '@/components/isl-video-player'
import { LiveKitVideoCall } from '@/components/livekit-video-call'
import { VisionGestureCamera } from '@/components/vision-gesture-camera'
import { useSessionRealtime } from '@/hooks/use-session-realtime'
import { getClipUrl } from '@/lib/isl-clips'
import type { DetailedPictogram } from '@/lib/pictograms'
import {
  CheckCircle2,
  Video,
  Shield,
  X,
  Sparkles,
  PhoneOff,
  Hand,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// ─── Patient kiosk page ────────────────────────────────────────────────────────────

export default function PatientPage() {
  const params = useParams<{ sessionId: string }>()
  const sessionId = params.sessionId || '00000000-0000-0000-0000-000000000001'

  const [lastAlertText, setLastAlertText] = useState<string | null>(null)
  const [lastAlertHindi, setLastAlertHindi] = useState<string | null>(null)
  const [showingConfirmation, setShowingConfirmation] = useState(false)
  const [bedName, setBedName] = useState('Bedside Kiosk (ISL)')
  const [fallbackCountdown, setFallbackCountdown] = useState<number>(30)

  useEffect(() => {
    fetch(`/api/session?id=${encodeURIComponent(sessionId)}`)
      .then((res) => (res.ok && res.headers.get('content-type')?.includes('application/json') ? res.json() : null))
      .then((data) => {
        if (data?.session?.patient_display_name) {
          setBedName(data.session.patient_display_name)
        }
      })
      .catch(() => {})
  }, [sessionId])

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

    // 1. Send alert via Realtime broadcast (only P0 urgent informs doctor via emergency banner)
    sendPictogramAlert(
      pictogram.key,
      pictogram.label,
      pictogram.category,
      pictogram.priority,
      isUrgent,
      bedName
    )

    // 2. Show clear confirmation banner for Deaf patient
    setLastAlertText(fullNote)
    setLastAlertHindi(
      pictogram.hindiText || (isUrgent ? 'डॉक्टर को तुरंत सूचित कर दिया गया है' : 'नर्सिंग स्टेशन को सूचित किया गया')
    )
    setShowingConfirmation(true)

    if (isUrgent) {
      toast.error(`Urgent Alert Sent: ${fullNote} • डॉक्टर को तुरंत सूचित किया गया`)
    } else {
      toast.success(`Request Sent: ${fullNote} • सूचित किया गया`)
    }
  }

  const handleRequestInterpreter = () => {
    setFallbackCountdown(30)
    requestInterpreter({
      hospitalName: 'Apollo Multi-Specialty Hospital',
      patientName: bedName,
      note: 'Bedside request from patient tablet',
    })
    toast.info('Paging ISL interpreter relay pool...')
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
                  src="/logo.png"
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
        <div className="max-w-[1280px] mx-auto px-4 sm:px-7 min-h-[76px] py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-3">
            <span className="relative w-10 h-10 rounded-xl border border-border bg-white overflow-hidden shrink-0">
              <Image src="/logo.png" alt="" fill sizes="40px" className="object-contain p-1" priority />
            </span>
            <span className="font-heading font-bold text-2xl sm:text-[28px] tracking-tight">{bedName}</span>
          </div>
          <span role="status" className="flex items-center gap-2.5 text-base sm:text-[17px] font-semibold text-success-ink">
            <span className="w-3 h-3 rounded-full bg-success shrink-0" />
            <span className="flex flex-col leading-tight">
              <span>Your care team can see your messages</span>
              <span lang="hi" className="text-sm font-medium opacity-85">आपकी टीम आपके संदेश देख रही है</span>
            </span>
          </span>
        </div>
      </header>

      <div className="flex-1 max-w-[1280px] w-full mx-auto p-4 sm:px-7 sm:py-5 grid lg:grid-cols-[420px_minmax(0,1fr)] gap-6 items-start">
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
        </div>

        {/* ───── Right: confirmations + pictograms ───── */}
        <div className="flex flex-col gap-4 min-w-0">
          {showingConfirmation && lastAlertText && (
            <div
              role="status"
              className="rounded-2xl bg-success-surface border-[1.5px] border-success/50 text-success-ink px-4 py-3.5 flex items-center gap-3 animate-in slide-in-from-top-2 duration-200"
            >
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <span className="flex-1 text-[17px] font-semibold">
                Doctor has been told: {lastAlertText}
                {lastAlertHindi && <span lang="hi" className="font-medium"> • {lastAlertHindi}</span>}
              </span>
              <Button
                variant="ghost"
                onClick={() => setShowingConfirmation(false)}
                className="h-12 px-4 rounded-xl font-semibold text-success-ink hover:bg-success/10"
              >
                OK
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">
              Tap to tell us how you feel <span lang="hi" className="font-medium text-base text-muted-foreground">/ अपनी तकलीफ़ बताएं</span>
            </h2>
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
