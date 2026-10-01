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
  Clock,
  Loader2,
  QrCode,
  AlertTriangle,
  RefreshCw,
  XCircle,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

  const borderColor = isPainOrEmergency
    ? 'border-red-500 bg-red-500/5'
    : isPositive
    ? 'border-green-500 bg-green-500/5'
    : 'border-blue-500 bg-blue-500/5'

  const labelColor = isPainOrEmergency
    ? 'text-red-400'
    : isPositive
    ? 'text-green-400'
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
      const utt = new SpeechSynthesisUtterance(payload.text)
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

  const severeCount = events.filter(isSevereOrCriticalEvent).length
  const quickPhrases = [
    { label: 'You are safe', key: 'you-are-safe' },
    { label: 'We are helping you', key: 'we-are-helping' },
    { label: 'Take this medicine', key: 'take-medicine' },
    { label: 'Stay still', key: 'stay-still' },
    { label: 'Relax / breathe', key: 'relax' },
    { label: 'Do you agree?', key: 'do-you-agree' },
    { label: 'We need to do a test', key: 'need-to-do-test' },
    { label: 'Do you have family here?', key: 'family-here' },
  ]

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="px-4 sm:px-6 py-3 flex items-center gap-4 flex-wrap">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2.5 text-foreground"
            aria-label="Back to bed roster"
          >
            <span className="relative w-9 h-9 rounded-[10px] border border-border bg-white overflow-hidden shrink-0">
              <Image src="/logo.png" alt="" fill sizes="36px" className="object-contain p-1" priority />
            </span>
            <span className="font-heading font-bold text-[19px]">Ishara</span>
          </button>
          <span className="hidden sm:block h-6 w-px bg-border" />
          <span className="hidden sm:block text-[15px] font-semibold text-secondary-foreground">Staff console</span>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="h-10 rounded-[10px] border-input text-sm font-semibold gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Bed roster</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setPairingOpen(true)}
              className="h-10 rounded-[10px] border-input text-sm font-semibold gap-1.5"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">Pair tablet</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`/patient/${sessionId}`, '_blank')}
              className="h-10 rounded-[10px] border-input text-sm font-semibold gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Open tablet</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6 grid lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        {/* ───── Main column ───── */}
        <div className="flex flex-col gap-4 min-w-0">
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
          <EmergencyAlertBanner
            alert={activeAlert}
            patientDisplayName={patientDisplayName}
            onAcknowledge={clearAlert}
            onRequestInterpreter={handlePageInterpreter}
          />

          <section className="bg-card border border-border rounded-[18px] flex flex-col min-h-[560px]">
            {/* Patient header */}
            <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
              <h1 className="font-heading font-bold text-2xl">{patientDisplayName}</h1>
              <span className="px-2.5 py-1 rounded-full bg-muted text-[13px] font-semibold text-secondary-foreground">
                ISL user
              </span>
              {severeCount > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-emergency-surface text-[13px] font-semibold text-emergency-ink">
                  {severeCount} severe event{severeCount === 1 ? '' : 's'}
                </span>
              )}
              <span className="ml-auto text-xs text-muted-foreground font-mono">Session {sessionId.slice(0, 8)}</span>
            </div>

            {/* Conversation / audit timeline */}
            <div className="px-5 py-4 flex-1 overflow-y-auto max-h-[560px]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-heading font-semibold text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-ink" />
                  Conversation
                </h2>
                <span className="text-xs text-muted-foreground">
                  {events.length} interaction{events.length === 1 ? '' : 's'} · live
                </span>
              </div>
              {hiddenEventIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHiddenEventIds(new Set())}
                  className="mb-3 rounded-full border-input font-semibold"
                >
                  Show full audit history
                </Button>
              )}
              <TranscriptFeed
                events={events.filter((event) => !hiddenEventIds.has(event.id))}
                initialFilterSevere={false}
                onClearEvents={handleClearAuditTrail}
              />
            </div>

            {/* Composer */}
            <div className="px-5 pt-4 pb-5 border-t border-border flex flex-col gap-3">
              <div className="flex gap-2 flex-wrap">
                {quickPhrases.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => handleSendISLPhrase(chip.label, chip.key)}
                    className="h-9 px-3.5 rounded-full border border-input bg-card text-sm font-semibold text-secondary-foreground hover:border-teal hover:text-teal-ink transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2.5 items-center">
                <label htmlFor="isl-message" className="sr-only">
                  Message to sign to the patient
                </label>
                <Input
                  id="isl-message"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendISLPhrase()}
                  placeholder="Type or dictate in English, Hindi or Hinglish…"
                  className="h-[52px] text-base rounded-xl border-[1.5px] border-input flex-1 min-w-0"
                />
                {isSupported && (
                  <Button
                    type="button"
                    variant={isListening ? 'destructive' : 'outline'}
                    size="icon"
                    onClick={handleToggleListening}
                    className="h-[52px] w-[52px] rounded-xl shrink-0 border-[1.5px] border-input"
                    aria-label={isListening ? 'Stop dictation' : 'Dictate'}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-teal-ink" />}
                  </Button>
                )}
                <Button
                  onClick={() => handleSendISLPhrase()}
                  disabled={isSearching || !inputText.trim()}
                  className="h-[52px] px-5 bg-teal hover:bg-teal-light text-white rounded-xl shrink-0 font-semibold gap-2"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Sign it
                </Button>
              </div>
              {isListening && (
                <span role="status" className="text-xs font-semibold text-emergency-ink flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emergency" />
                  Listening…
                </span>
              )}
            </div>
          </section>
        </div>

        {/* ───── Right rail ───── */}
        <aside className="flex flex-col gap-4">
          {/* Remote interpreter */}
          <section className="bg-card border border-border rounded-[18px] overflow-hidden">
            <div className="px-[18px] py-4 bg-indigo-surface flex items-center gap-2.5">
              <Video className="w-5 h-5 text-indigo" />
              <h2 className="font-heading font-bold text-[17px] text-indigo-ink">Remote interpreter</h2>
            </div>
            <div className="p-[18px] flex flex-col gap-3.5">
              {sessionStatus === 'interpreter_requested' ? (
                <>
                  <div role="status" className="flex items-baseline justify-between gap-2">
                    <span className="text-[15px] font-semibold">
                      {escalationTriggered ? 'No interpreter yet' : 'Paging standby pool…'}
                    </span>
                    {countdownSeconds !== null && !escalationTriggered && (
                      <span className="font-heading font-bold text-[28px] text-indigo-ink tabular-nums">
                        00:{String(countdownSeconds).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  {!escalationTriggered && countdownSeconds !== null && (
                    <span className="h-1.5 rounded-full bg-indigo-surface overflow-hidden flex">
                      <span
                        className="bg-indigo transition-[width] duration-1000 ease-linear"
                        style={{ width: `${((60 - countdownSeconds) / 60) * 100}%` }}
                      />
                    </span>
                  )}
                  {escalationTriggered ? (
                    <div className="flex gap-2.5 p-3 rounded-xl bg-warning-surface text-warning-ink text-sm">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Nobody accepted within 60s. Use the ISL phrases on the left while you re-page.</span>
                    </div>
                  ) : (
                    <span className="text-[13px] leading-normal text-muted-foreground">
                      The tablet joins two-way video as soon as an interpreter accepts.
                    </span>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={handlePageInterpreter}
                      className="h-11 rounded-[10px] border-input font-semibold gap-1.5"
                    >
                      <RefreshCw className="w-4 h-4" /> Re-page
                    </Button>
                    <Button
                      onClick={cancelInterpreterRequest}
                      className="h-11 rounded-[10px] bg-emergency-surface text-emergency-ink hover:bg-emergency-surface/80 font-semibold gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Cancel
                    </Button>
                  </div>
                </>
              ) : sessionStatus === 'interpreter_connected' ? (
                <>
                  <span role="status" className="flex items-center gap-2 text-[15px] font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-success" />
                    Connected · two-way video live
                  </span>
                  <Button
                    onClick={() => window.open(`/interpreter/call/${sessionId}`, '_blank')}
                    className="h-11 rounded-[10px] bg-indigo hover:bg-indigo-hover text-white font-semibold"
                  >
                    Open call stream
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-2 text-[15px] font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    Standby
                  </span>
                  <span className="text-[13px] leading-normal text-muted-foreground">
                    Page a certified ISL interpreter into this bed by live video.
                  </span>
                  <Button
                    onClick={handlePageInterpreter}
                    disabled={isPagingInterpreter}
                    className="h-12 rounded-[10px] bg-indigo hover:bg-indigo-hover text-white font-semibold gap-2"
                  >
                    <Video className="w-4 h-4" />
                    {isPagingInterpreter ? 'Paging…' : 'Page interpreter'}
                  </Button>
                </>
              )}
            </div>
          </section>

          {/* Session summary */}
          <section className="bg-card border border-border rounded-[18px] p-[18px] flex flex-col gap-3">
            <h2 className="font-heading font-bold text-[17px]">This session</h2>
            <dl className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-[14px] bg-background flex flex-col-reverse gap-1">
                <dt className="text-[13px] text-muted-foreground">Interactions</dt>
                <dd className="font-heading font-bold text-[26px] tabular-nums">{events.length}</dd>
              </div>
              <div className="p-3.5 rounded-[14px] bg-background flex flex-col-reverse gap-1">
                <dt className="text-[13px] text-muted-foreground flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-emergency-ink" /> Severe
                </dt>
                <dd className="font-heading font-bold text-[26px] tabular-nums text-emergency-ink">{severeCount}</dd>
              </div>
            </dl>
          </section>

          {/* Pairing */}
          <section className="bg-card border border-border rounded-[18px] p-[18px] flex flex-col gap-3">
            <h2 className="font-heading font-bold text-[17px]">Bedside tablet</h2>
            <span className="text-[13px] leading-normal text-muted-foreground">
              Create a one-time pairing QR for the patient&apos;s tablet.
            </span>
            <Button
              variant="outline"
              onClick={() => setPairingOpen(true)}
              className="h-11 rounded-[10px] border-input font-semibold gap-1.5"
            >
              <QrCode className="w-4 h-4" /> Pair tablet
            </Button>
          </section>
        </aside>
      </div>

      {/* Bedside Tablet QR Pairing Modal */}
      <Dialog open={pairingOpen} onOpenChange={setPairingOpen}>
        <DialogContent className="max-w-md bg-card border border-border p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-teal dark:text-teal-400" />
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
