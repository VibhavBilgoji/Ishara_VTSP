'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { GestureTextPayload } from '@/hooks/use-session-realtime'
import Image from 'next/image'
import { KioskPairing } from '@/components/kiosk-pairing'
import { EmergencyAlertBanner } from '@/components/emergency-alert-banner'
import { TranscriptFeed, isSevereOrCriticalEvent } from '@/components/transcript-feed'
import { useSessionRealtime } from '@/hooks/use-session-realtime'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { searchClips, getClipByKey, getClipUrl } from '@/lib/isl-clips'
import {
  ArrowLeft,
  Video,
  Mic,
  MicOff,
  Send,
  ExternalLink,
  Sparkles,
  Clock,
  FileText,
  Loader2,
  QrCode,
  AlertTriangle,
  RefreshCw,
  XCircle,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

// \u2500\u2500\u2500 GestureBanner component \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

interface GestureBannerProps {
  latestGesture:     GestureTextPayload | null
  gestureHistory:    GestureTextPayload[]
  visible:           boolean
  autoSpeak:         boolean
  onToggleAutoSpeak: (v: boolean) => void
  onDismiss:         () => void
  onSpeak:           (text: string) => void
}

function GestureBanner({
  latestGesture,
  gestureHistory,
  visible,
  autoSpeak,
  onToggleAutoSpeak,
  onDismiss,
  onSpeak,
}: GestureBannerProps) {
  const [historyOpen, setHistoryOpen] = useState(false)

  if (!latestGesture) return null

  const isPainOrEmergency =
    latestGesture.text.toLowerCase().includes('pain') ||
    latestGesture.text.toLowerCase().includes('emergency') ||
    latestGesture.text.toLowerCase().includes('help')

  const isPositive =
    latestGesture.text.toLowerCase().includes('okay') ||
    latestGesture.text.toLowerCase().includes('yes') ||
    latestGesture.text.toLowerCase().includes('fine')

  // MEDIUM severity labels — matched on display text (payload only carries text, not raw label)
  const MEDIUM_SEVERITY_DISPLAY = new Set([
    'Coughing',
    'Nausea',
    'Feeling weak / tired',
  ])
  const isAmber =
    !isPainOrEmergency &&
    !isPositive &&
    MEDIUM_SEVERITY_DISPLAY.has(latestGesture.text)

  const borderColor = isPainOrEmergency
    ? 'border-red-500 bg-red-500/5'
    : isPositive
    ? 'border-green-500 bg-green-500/5'
    : isAmber
    ? 'border-amber-500 bg-amber-500/5'
    : 'border-blue-500 bg-blue-500/5'

  const labelColor = isPainOrEmergency
    ? 'text-red-400'
    : isPositive
    ? 'text-green-400'
    : isAmber
    ? 'text-amber-400'
    : 'text-blue-400'

  const timeAgo = (() => {
    const secs = Math.round((Date.now() - new Date(latestGesture.timestamp).getTime()) / 1000)
    if (secs < 5)  return 'just now'
    if (secs < 60) return `${secs}s ago`
    return `${Math.round(secs / 60)}m ago`
  })()

  return (
    <div
      className={`rounded-xl border-l-4 p-4 transition-all duration-300 ${borderColor} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
      }`}
      role="alert"
      aria-live="assertive"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/15 text-purple-300 text-xs font-bold">
            ISL
          </span>
          <span className="text-xs text-gray-400">Patient signed</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Auto-speak toggle */}
          <button
            onClick={() => onToggleAutoSpeak(!autoSpeak)}
            className={`text-xs px-2 py-1 rounded-md border transition-colors ${
              autoSpeak
                ? 'border-blue-500/40 text-blue-400 bg-blue-500/10'
                : 'border-gray-600 text-gray-400 bg-transparent'
            }`}
            title={autoSpeak ? 'Auto-speak on' : 'Auto-speak off'}
          >
            {autoSpeak ? '🔊 Auto' : '🔇 Muted'}
          </button>

          {/* Dismiss */}
          <button
            onClick={onDismiss}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
            aria-label="Dismiss gesture banner"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Main gesture text */}
      <p className={`text-xl font-semibold mt-2 ${labelColor}`}>
        {latestGesture.text}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-3 mt-2">
        <span className="text-xs text-gray-400">
          {Math.round(latestGesture.confidence * 100)}% confidence
        </span>
        <span className="text-gray-600">·</span>
        <span className="text-xs text-gray-400">{timeAgo}</span>

        {/* Speak again button */}
        <button
          onClick={() => onSpeak(latestGesture.text)}
          className="ml-auto text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072M12 6a7.071 7.071 0 010 12M9 9.343a4 4 0 000 5.314"/>
          </svg>
          Speak again
        </button>
      </div>

      {/* Collapsible history */}
      {gestureHistory.length > 1 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <button
            onClick={() => setHistoryOpen(o => !o)}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            {historyOpen ? 'Hide' : 'Show'} history ({gestureHistory.length - 1} previous)
          </button>

          {historyOpen && (
            <ul className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {gestureHistory.slice(1).map((g, i) => (
                <li key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">{g.text}</span>
                  <span className="text-gray-500 ml-3 flex-shrink-0">
                    {new Date(g.timestamp).toLocaleTimeString([], {
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// \u2500\u2500\u2500 Dashboard page \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

export default function DashboardPage() {
  const router = useRouter()
  const params = useParams<{ sessionId: string }>()
  const sessionId = params.sessionId || '00000000-0000-0000-0000-000000000001'

  const [inputText, setInputText] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isPagingInterpreter, setIsPagingInterpreter] = useState(false)
  const [patientDisplayName, setPatientDisplayName] = useState('Bedside patient')
  const [pairingOpen, setPairingOpen] = useState(false)
  const [hospitalName, setHospitalName] = useState('Hospital')
  const [hiddenEventIds, setHiddenEventIds] = useState<Set<string>>(new Set())
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null)
  const [escalationTriggered, setEscalationTriggered] = useState(false)

  // ─ Gesture state ─────────────────────────────────────────────────────────
  const [latestGesture,   setLatestGesture]   = useState<GestureTextPayload | null>(null)
  const [gestureBanner,   setGestureBanner]   = useState(false)
  const [autoSpeak,       setAutoSpeak]       = useState(true)
  const [gestureHistory,  setGestureHistory]  = useState<GestureTextPayload[]>([])
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Clearer spoken phrases keyed by display text (payload.text is the display text, not the raw label)
  const SPEECH_TEXT: Record<string, string> = {
    'Need help':             'Patient needs help',
    "Can't sleep":           'Patient cannot sleep or needs rest',
    'Feeling weak / tired':  'Patient is feeling weak or tired',
    'Coughing':              'Patient is coughing',
    'Nausea':                'Patient feels nauseous',
    'Itching':               'Patient has itching or skin irritation',
  }

  const handleGestureReceived = useCallback((payload: GestureTextPayload) => {
    setLatestGesture(payload)
    setGestureHistory(prev => [payload, ...prev].slice(0, 20))
    setGestureBanner(true)

    // Auto-clear banner after 5 seconds
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
    bannerTimerRef.current = setTimeout(() => setGestureBanner(false), 5000)

    // Text-to-speech so the clinician hears the sign name
    if (autoSpeak && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      const spokenText = SPEECH_TEXT[payload.text] ?? payload.text
      const utt = new SpeechSynthesisUtterance(spokenText)
      utt.rate  = 0.95
      utt.pitch = 1
      window.speechSynthesis.speak(utt)
    }
  }, [autoSpeak])

  const {
    activeAlert,
    sessionStatus,
    events,
    clearAlert,
    sendPlayClip,
    requestInterpreter,
    cancelInterpreterRequest,
    setEvents,
  } = useSessionRealtime({
    sessionId,
    onGestureReceived: handleGestureReceived,
  })

  const {
    isSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition()

  useEffect(() => {
    if (transcript) {
      setInputText(transcript)
    }
  }, [transcript])

  // Fetch session details and previous events if available
  useEffect(() => {
    fetch(`/api/session?id=${sessionId}`)
      .then((res) => (res.ok && res.headers.get('content-type')?.includes('application/json') ? res.json() : null))
      .then((data) => {
        if (data?.session?.patient_display_name) {
          setPatientDisplayName(data.session.patient_display_name)
          setHospitalName(data.hospital?.name || 'Hospital')
        }
      })
      .catch(() => {})

    fetch(`/api/session/${sessionId}/events`)
      .then((res) => (res.ok && res.headers.get('content-type')?.includes('application/json') ? res.json() : null))
      .then((data) => {
        if (data?.events && Array.isArray(data.events) && data.events.length > 0) {
          setEvents((prev) => {
            const existingIds = new Set(prev.map((e) => e.id))
            const newEvents = data.events.filter((e: any) => !existingIds.has(e.id))
            return [...prev, ...newEvents]
          })
        }
      })
      .catch(() => {})
  }, [sessionId, setEvents])

  const handleToggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      startListening()
      toast.info('Listening for clinical speech...')
    }
  }

  const handleClearAuditTrail = () => {
    setHiddenEventIds(new Set(events.map((event) => event.id)))
    toast.success('Earlier interactions hidden from this view. The audit record is retained.')
  }

  const handleSendISLPhrase = async (phrase?: string, clipKey?: string) => {
    const query = phrase || inputText.trim()
    if (!query && !clipKey) return

    setIsSearching(true)
    try {
      let bestClip: any = null
      let clipUrl: string = ''

      // 1. Try API lookup first for server-signed Supabase URL
      try {
        const res = await fetch('/api/isl-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clipKey ? { key: clipKey } : { query }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.match?.clip) {
            bestClip = data.match.clip
            clipUrl = data.match.signedUrl || getClipUrl(bestClip.storage_path)
          }
        }
      } catch (err) {
        console.warn('API lookup error, falling back to client index', err)
      }

      // 2. Fallback to client-side search if API did not return a match
      if (!bestClip) {
        if (clipKey) {
          const matched = getClipByKey(clipKey)
          if (matched) {
            bestClip = matched
            clipUrl = getClipUrl(matched.storage_path)
          }
        }
        if (!bestClip && query) {
          const matches = searchClips(query, 1)
          if (matches.length > 0 && matches[0]) {
            bestClip = matches[0].clip
            clipUrl = matches[0].signedUrl || getClipUrl(bestClip.storage_path)
          }
        }
      }

      if (bestClip && clipUrl) {
        sendPlayClip(bestClip.key, clipUrl, bestClip.label)
        toast.success(`Broadcasting ISL clip "${bestClip.label}" to patient tablet`)
        setInputText('')
        resetTranscript()
      } else {
        toast.error(`No matching ISL clip found for "${query || clipKey}". Try rephrasing or requesting an interpreter.`)
      }
    } catch {
      toast.error('Failed to lookup ISL sign')
    } finally {
      setIsSearching(false)
    }
  }

  const handlePageInterpreter = () => {
    setIsPagingInterpreter(true)
    requestInterpreter({
      hospitalName,
      patientName: patientDisplayName,
      note: 'Staff station remote paging',
    })
    toast.info('Paging ISL interpreters...')
    setTimeout(() => setIsPagingInterpreter(false), 2500)
  }

  // 60-Second Auto-Fallback Escalation Timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (sessionStatus === 'interpreter_requested') {
      setCountdownSeconds(60)
      setEscalationTriggered(false)
      timer = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev === null || prev <= 1) {
            setEscalationTriggered(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      setCountdownSeconds(null)
      setEscalationTriggered(false)
      if (timer) clearInterval(timer)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [sessionStatus])

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="Ishara Logo"
                fill
                sizes="36px"
                className="object-contain p-1"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-[#084C5B] dark:text-teal-300">
                  Ishara Clinical Station
                </h1>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200">
                  Doctor / Staff Monitor
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Patient: <span className="font-bold text-slate-800 dark:text-slate-200">{patientDisplayName}</span> • Session: {sessionId.slice(0, 8)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center gap-1 border border-slate-300 dark:border-slate-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bed Roster</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPairingOpen(true)}
              className="border-teal-300 text-[#084C5B] hover:bg-teal-50 dark:border-teal-700 dark:text-teal-300 text-xs flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              Pair Tablet
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/patient/${sessionId}`, '_blank')}
              className="border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 text-xs flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Tablet
            </Button>

            {sessionStatus === 'interpreter_requested' ? (
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                  Paging...
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelInterpreterRequest}
                  className="h-8 px-2.5 text-xs font-bold border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handlePageInterpreter}
                disabled={isPagingInterpreter || sessionStatus === 'interpreter_connected'}
                className={`
                  text-xs font-bold flex items-center gap-1.5
                  ${sessionStatus === 'interpreter_connected'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-[#4F46E5] hover:bg-[#4338CA] text-white'
                  }
                `}
              >
                <Video className="w-4 h-4" />
                {sessionStatus === 'interpreter_connected'
                  ? 'Interpreter Active'
                  : isPagingInterpreter
                  ? 'Paging...'
                  : 'Page Interpreter'}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Dashboard Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Gesture Banner — appears when patient signs */}
        <GestureBanner
          latestGesture={latestGesture}
          gestureHistory={gestureHistory}
          visible={gestureBanner}
          autoSpeak={autoSpeak}
          onToggleAutoSpeak={setAutoSpeak}
          onDismiss={() => setGestureBanner(false)}
          onSpeak={(text) => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
              window.speechSynthesis.cancel()
              window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
            }
          }}
        />
        {/* Emergency Alert Banner (P0 Realtime) */}
        <EmergencyAlertBanner
          alert={activeAlert}
          patientDisplayName={patientDisplayName}
          onAcknowledge={clearAlert}
          onRequestInterpreter={handlePageInterpreter}
        />

        {/* 60-Second Auto-Fallback Escalation Alert */}
        {sessionStatus === 'interpreter_requested' && (
          <div
            role="status"
            className={`w-full p-4 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md transition-all ${
              escalationTriggered
                ? 'bg-amber-50 border-amber-500 text-amber-950 dark:bg-amber-950/40 dark:border-amber-500 dark:text-amber-100'
                : 'bg-indigo-50 border-indigo-400 text-indigo-950 dark:bg-indigo-950/40 dark:border-indigo-600 dark:text-indigo-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${escalationTriggered ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white'}`}>
                {escalationTriggered ? <AlertTriangle className="w-5 h-5" /> : <Video className="w-5 h-5 animate-pulse" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded text-white ${escalationTriggered ? 'bg-amber-600' : 'bg-indigo-600'}`}>
                    {escalationTriggered ? 'Auto-Fallback Escalation' : 'Paging ISL Relay'}
                  </span>
                  {!escalationTriggered && countdownSeconds !== null && (
                    <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300">
                      Escalation in {countdownSeconds}s
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-sm sm:text-base mt-0.5">
                  {escalationTriggered
                    ? 'No remote interpreter accepted within 60s. Auto-fallback recommended.'
                    : 'Paging certified remote ISL interpreters. Standing by for connection...'}
                </h4>
                <p className="text-xs opacity-80">
                  {escalationTriggered
                    ? 'Recommend using the ISL Video Library (P2 AI Fallback) below to play pre-recorded sign clips on the patient tablet.'
                    : 'The patient screen will automatically connect into 2-party HD video when an interpreter accepts.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={cancelInterpreterRequest}
                className="text-xs font-bold flex items-center gap-1 bg-white dark:bg-slate-900 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel Request
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePageInterpreter}
                className="text-xs font-bold flex items-center gap-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Re-Page
              </Button>
            </div>
          </div>
        )}

        {/* Status Metrics Bar (Dynamic Session Data Only) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-3 sm:p-4">
              <span className="text-xs text-slate-500 font-medium">Remote Interpreter</span>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    sessionStatus === 'interpreter_connected'
                      ? 'bg-emerald-500'
                      : sessionStatus === 'interpreter_requested'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  }`}
                />
                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {sessionStatus === 'interpreter_connected'
                    ? 'Connected (2-Way Video Live)'
                    : sessionStatus === 'interpreter_requested'
                    ? 'Paging Standby Pool...'
                    : 'Standby'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-3 sm:p-4">
              <span className="text-xs text-slate-500 font-medium">Critical Audit Events</span>
              <div className="flex items-center gap-2 mt-1">
                <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {events.filter(isSevereOrCriticalEvent).length} Severe Cases
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  ({events.length} total)
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two-Column Clinical Section: Left = Communication Console, Right = Live Transcript Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* Left Column: Clinician Communication Console */}
          <div className="space-y-4">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-black text-[#084C5B] dark:text-teal-300 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-teal-600" />
                    Send ISL Video Signs to Patient
                  </CardTitle>
                  <span className="text-xs text-slate-500">P2 Assisted Communication</span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Dictate or type clinical message to match pre-recorded Indian Sign Language clip:
                  </span>
                  {isListening && (
                    <span className="text-xs font-bold text-red-600 animate-pulse flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
                      Listening to speech...
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {isSupported && (
                    <Button
                      type="button"
                      variant={isListening ? 'destructive' : 'outline'}
                      size="icon"
                      onClick={handleToggleListening}
                      className="h-12 w-12 rounded-xl shrink-0"
                      aria-label={isListening ? 'Stop recording' : 'Start speech recognition'}
                    >
                      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-[#084C5B]" />}
                    </Button>
                  )}

                  <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendISLPhrase()}
                    placeholder="Type or dictate: e.g. 'You are safe', 'Take this medicine'..."
                    className="h-12 text-base rounded-xl border-slate-300 dark:border-slate-700 flex-1"
                  />

                  <Button
                    onClick={() => handleSendISLPhrase()}
                    disabled={isSearching || !inputText.trim()}
                    className="h-12 px-5 bg-[#084C5B] hover:bg-[#0D748A] text-white rounded-xl shrink-0 font-bold"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Quick Action Chips */}
                <div>
                  <span className="text-xs font-semibold text-slate-500 block mb-2">
                    Quick Clinical Reassurances:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'You are safe', key: 'you-are-safe' },
                      { label: 'We are helping you', key: 'we-are-helping' },
                      { label: 'Take this medicine', key: 'take-medicine' },
                      { label: 'Stay still', key: 'stay-still' },
                      { label: 'Relax / breathe', key: 'relax' },
                      { label: 'Do you agree?', key: 'do-you-agree' },
                      { label: 'We need to do a test', key: 'need-to-do-test' },
                      { label: 'Do you have family here?', key: 'family-here' },
                    ].map((chip) => (
                      <button
                        key={chip.key}
                        type="button"
                        onClick={() => handleSendISLPhrase(chip.label, chip.key)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-teal-50 hover:text-[#084C5B] dark:hover:bg-teal-950/60 dark:hover:text-teal-200 border border-slate-200 dark:border-slate-700 transition-colors"
                      >
                        + {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Video Call Tile (When LiveKit is Connected) */}
            {sessionStatus === 'interpreter_connected' && (
              <Card className="bg-indigo-950 text-white border-2 border-indigo-500 overflow-hidden shadow-xl">
                <CardHeader className="p-4 bg-indigo-900 border-b border-indigo-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="w-5 h-5 text-indigo-300 animate-pulse" />
                      <CardTitle className="text-base font-bold">
                        Live ISL Interpreter Relay Active
                      </CardTitle>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-600 text-white font-bold uppercase">
                      2-Party Video Live
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-indigo-200">
                    Patient and remote certified interpreter are connected in a private LiveKit session.
                  </p>
                  <Button
                    onClick={() => window.open(`/interpreter/call/${sessionId}`, '_blank')}
                    className="bg-white text-indigo-950 hover:bg-indigo-100 font-bold shrink-0"
                  >
                    Open Call Stream
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Live Audit Trail / Transcript Feed */}
          <div className="space-y-4">
            <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#084C5B]" />
                      Live Interaction Audit Trail
                    </CardTitle>
                    <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-800 px-1.5 py-0.5 rounded">
                      Live Sync
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {events.length} interaction{events.length === 1 ? '' : 's'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 overflow-y-auto max-h-[600px]">
                {hiddenEventIds.size > 0 && <Button variant="outline" size="sm" onClick={() => setHiddenEventIds(new Set())}>Show full audit history</Button>}
                <TranscriptFeed
                  events={events.filter((event) => !hiddenEventIds.has(event.id))}
                  initialFilterSevere={false}
                  onClearEvents={handleClearAuditTrail}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bedside Tablet QR Pairing Modal */}
      <Dialog open={pairingOpen} onOpenChange={setPairingOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-2 border-[#084C5B] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#084C5B] dark:text-teal-400" />
              Bedside Tablet Pairing
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Scan with an iPad, Android tablet, or smartphone camera to launch this patient&apos;s bedside kiosk.
            </DialogDescription>
          </DialogHeader>

          {pairingOpen && <KioskPairing sessionId={sessionId} />}
        </DialogContent>
      </Dialog>
    </main>
  )
}
