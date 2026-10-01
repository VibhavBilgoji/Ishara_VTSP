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
  const [hospitalName, setHospitalName] = useState('Hospital')
  const [fallbackCountdown, setFallbackCountdown] = useState<number>(30)

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
      hospitalName,
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
      <main className="h-screen w-screen bg-slate-950 text-white flex flex-col overflow-hidden p-2 sm:p-4">
        {/* Top Header for Patient Live Video Call */}
        <header className="flex items-center justify-between pb-2 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnectInterpreter}
              className="bg-red-950/60 border-red-500/60 text-red-200 hover:bg-red-900 hover:text-white text-xs font-bold flex items-center gap-1.5 rounded-xl h-9 px-3.5 transition-all shadow-sm"
            >
              <PhoneOff className="w-3.5 h-3.5 text-red-400" />
              <span>Disconnect Call / समाप्त करें</span>
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
                  <h1 className="text-sm sm:text-base font-black text-teal-300">
                    Ishara Live Relay Room
                  </h1>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-700/50 animate-pulse">
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
    <main className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Patient Header */}
      <header className="p-3 sm:p-4 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="Ishara Logo"
                fill
                sizes="40px"
                className="object-contain p-1"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-[#084C5B] dark:text-teal-300">
                  Ishara • इशारा
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  {bedName}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Touch any card to alert medical staff immediately
              </p>
            </div>
          </div>

          <div className="sm:hidden">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
              {bedName}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col gap-4">
        {/* Dedicated 1-Tap ISL Interpreter Call Card for Deaf Patient */}
        {sessionStatus === 'interpreter_requested' ? (
          <div className="w-full p-4 sm:p-5 rounded-2xl bg-amber-50 border-2 border-amber-400 text-amber-950 dark:bg-amber-950/40 dark:border-amber-600 dark:text-amber-100 flex items-center justify-between gap-3 shadow-md animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-200 dark:bg-amber-900/60 rounded-full shrink-0">
                <Video className="w-6 h-6 text-amber-800 dark:text-amber-200 animate-bounce" />
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-amber-800 dark:text-amber-300 block">
                  Interpreter Paged • अनुवादक को संदेश भेजा गया है
                </span>
                <h3 className="text-base sm:text-lg font-black">
                  Connecting to Remote ISL Interpreter...
                </h3>
                <p className="text-xs opacity-80 mt-0.5">
                  Please stay in front of this screen. Video relay will launch automatically, or auto-fallback to AI Sign Assistant in {fallbackCountdown}s.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="hidden sm:inline-flex items-center gap-2 px-3.5 h-10 rounded-xl bg-amber-100/90 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs font-extrabold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span>Connecting ({fallbackCountdown}s)...</span>
              </div>
              <Button
                variant="outline"
                onClick={handleCancelInterpreter}
                className="h-10 px-4 rounded-xl font-bold text-xs sm:text-sm bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-400 dark:hover:border-red-500/80 transition-all flex items-center gap-1.5 shadow-xs"
              >
                <X className="w-4 h-4" />
                <span>Cancel / रद्द करें</span>
              </Button>
            </div>
          </div>
        ) : sessionStatus === 'ai_fallback' ? (
          <div className="w-full p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border-2 border-purple-400 dark:border-purple-600 text-purple-950 dark:text-purple-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-200 dark:bg-purple-900/60 rounded-full shrink-0">
                <Sparkles className="w-6 h-6 text-purple-800 dark:text-purple-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-purple-800 dark:text-purple-300 block">
                    AI Assisted Sign Interpreter Active (P3 Fallback)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100">
                    Auto-Switched
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black">
                  Live Interpreter Busy • सांकेतिक भाषा एआई कैमरा सक्रिय है
                </h3>
                <p className="text-xs opacity-85 mt-0.5">
                  Sign in front of the camera below for automatic translation, or retry paging a human interpreter.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handleRequestInterpreter}
                className="flex-1 sm:flex-initial h-10 px-3.5 rounded-xl font-bold text-xs bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-950 shadow-xs"
              >
                🔄 Retry Live Interpreter
              </Button>
              <Button
                variant="ghost"
                onClick={() => sendStatusChange('active')}
                className="h-10 px-3 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              >
                Dismiss
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-teal-50 dark:from-indigo-950/30 dark:to-teal-950/30 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#4F46E5] text-white shrink-0 shadow">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  Need Indian Sign Language Translation? / क्या आपको सांकेतिक भाषा अनुवादक चाहिए?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Connect 2-party live HD video with a certified ISL interpreter directly from this tablet.
                </p>
              </div>
            </div>
            <Button
              onClick={handleRequestInterpreter}
              className="w-full sm:w-auto bg-[#4F46E5] hover:bg-[#4338CA] text-white font-black text-xs sm:text-sm h-10 px-5 rounded-xl flex items-center justify-center gap-2 shadow"
            >
              <Video className="w-4 h-4" />
              <span>🤟 Call Live Interpreter / अनुवादक बुलाएं</span>
            </Button>
          </div>
        )}

        {/* Instant Alert Confirmation Banner */}
        {showingConfirmation && lastAlertText && (
          <div
            role="status"
            className="w-full p-4 rounded-2xl bg-emerald-600 text-white shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-3 duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full shrink-0">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider opacity-90 block">
                  Alert Sent to Nurse Station / डॉक्टर को संदेश भेजा गया
                </span>
                <h2 className="text-xl sm:text-2xl font-black">
                  &ldquo;{lastAlertText}&rdquo; {lastAlertHindi && `• ${lastAlertHindi}`}
                </h2>
                <p className="text-xs opacity-80 mt-0.5">
                  Medical staff have been alerted. Please stay still.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowingConfirmation(false)}
              className="border-white/40 bg-white/10 hover:bg-white/20 text-white hover:text-white shrink-0 font-bold"
            >
              Dismiss
            </Button>
          </div>
        )}



        {/* P3 — Core Feature: AI Sign Language Recognition Camera Subscreen (Positioned Above Pictograms) */}
        <section
          aria-label="Indian Sign Language gesture recognition"
          className="w-full max-w-2xl mx-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-teal-600/30 dark:border-teal-500/30 p-4 sm:p-5 shadow-xl transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-[#084C5B] dark:text-teal-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>ISL AI Sign Recognition</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 dark:bg-teal-900/60 dark:text-teal-300 border border-teal-300 dark:border-teal-700">
                    AI सांकेतिक भाषा
                  </span>
                </h2>
              </div>
            </div>
          </div>

          <VisionGestureCamera
            sendGestureText={sendGestureText}
            className="w-full"
          />
        </section>

        {/* Pictogram Grid (P0) */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#084C5B]" />
              Tap to Request Immediate Care / अपनी तकलीफ़ बताएं
            </h2>
          </div>

          <PictogramGrid onTriggerAlert={handleTriggerAlert} />
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

      {/* Patient Footer */}
      <footer className="p-3 text-center text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60">
        Ishara Clinical Care Kiosk • Bedside Tablet Mode • WCAG AAA Accessible
      </footer>
    </main>
  )
}
