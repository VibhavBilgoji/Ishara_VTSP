'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import type { SessionEvent } from '@/lib/types'
import {
  MessageSquare,
  Sparkles,
  PlayCircle,
  AlertCircle,
  Volume2,
  VolumeX,
  Send,
  CheckCheck,
  ArrowDown,
  Stethoscope,
  Clock,
  Loader2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface ChatMessage {
  id: string
  sender: 'patient' | 'doctor'
  type: 'isl_gesture' | 'isl_response' | 'patient_alert' | 'staff_note'
  text: string
  timestamp: string
  confidence?: number
  clipKey?: string
  priority?: string
  isUrgent?: boolean
}

interface DoctorPatientChatProps {
  events: SessionEvent[]
  patientDisplayName?: string
  onSendISLPhrase?: (phrase: string) => Promise<void> | void
  isSearching?: boolean
}

export function DoctorPatientChat({
  events,
  patientDisplayName = 'Patient (ISL)',
  onSendISLPhrase,
  isSearching = false,
}: DoctorPatientChatProps) {
  const [chatInput, setChatInput] = useState('')
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Transform session events into structured chat messages
  const messages = useMemo(() => {
    const rawList: ChatMessage[] = []

    for (const evt of events) {
      const payload = (evt.payload as Record<string, any>) || {}
      const ts = evt.created_at || new Date().toISOString()

      if (evt.event_type === 'gesture_text') {
        // Patient ISL action transformed to text message
        const text = payload.text || payload.sign || ''
        if (text) {
          rawList.push({
            id: evt.id,
            sender: 'patient',
            type: 'isl_gesture',
            text,
            timestamp: ts,
            confidence: typeof payload.confidence === 'number' ? payload.confidence : undefined,
          })
        }
      } else if (evt.event_type === 'isl_played') {
        // Doctor ISL sign input response
        const label = payload.label || payload.clipKey || 'ISL Sign Dispatched'
        rawList.push({
          id: evt.id,
          sender: 'doctor',
          type: 'isl_response',
          text: label,
          timestamp: ts,
          clipKey: payload.clipKey,
        })
      } else if (evt.event_type === 'pictogram') {
        // Patient bedside alert / pictogram tap
        const label = payload.label || payload.clipKey || 'Alert'
        rawList.push({
          id: evt.id,
          sender: 'patient',
          type: 'patient_alert',
          text: payload.extraNote ? `${label} - ${payload.extraNote}` : label,
          timestamp: ts,
          priority: payload.priority,
          isUrgent: payload.isUrgent,
        })
      } else if (evt.event_type === 'staff_message') {
        // Direct staff note
        const text = payload.message || payload.text || ''
        if (text) {
          rawList.push({
            id: evt.id,
            sender: 'doctor',
            type: 'staff_note',
            text,
            timestamp: ts,
          })
        }
      }
    }

    // Sort chronologically (oldest at top, newest at bottom)
    rawList.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Deduplicate consecutive identical messages within 2 seconds (e.g. BroadcastChannel + Supabase double fire)
    const deduplicated: ChatMessage[] = []
    for (let i = 0; i < rawList.length; i++) {
      const current = rawList[i]
      const prev = deduplicated[deduplicated.length - 1]

      if (
        prev &&
        prev.sender === current.sender &&
        prev.text.trim().toLowerCase() === current.text.trim().toLowerCase() &&
        Math.abs(new Date(current.timestamp).getTime() - new Date(prev.timestamp).getTime()) < 2000
      ) {
        // Skip duplicate
        continue
      }
      deduplicated.push(current)
    }

    return deduplicated
  }, [events])

  // Track user scroll position to show/hide "Scroll to bottom" button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 80
    setShowScrollBottom(!isNearBottom)
  }

  // Smooth scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' })
    }
  }

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollToBottom('smooth')
  }, [messages.length])

  // Optional Text-To-Speech playback for patient signs
  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.95
      utterance.pitch = 1
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const phrase = chatInput.trim()
    if (!phrase || !onSendISLPhrase) return

    setChatInput('')
    await onSendISLPhrase(phrase)
  }

  const formatTime = (ts: string) => {
    try {
      const date = new Date(ts)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[520px]">
      {/* Chat Window Header */}
      <CardHeader className="py-3 px-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal dark:text-teal-300">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Bedside ISL Translation Dialogue
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </CardTitle>
              <p className="text-[11px] text-slate-500">
                Patient: <span className="font-semibold text-slate-700 dark:text-slate-300">{patientDisplayName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-TTS Toggle */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAutoSpeak(!autoSpeak)}
              title={autoSpeak ? 'Auto-speech enabled' : 'Auto-speech muted'}
              className={`h-7 px-2 text-xs font-semibold rounded-lg border transition-colors ${
                autoSpeak
                  ? 'border-teal-500/40 text-teal-600 dark:text-teal-400 bg-teal-500/10'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {autoSpeak ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 mr-1 text-teal-600 dark:text-teal-400" />
                  TTS On
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Muted
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages Feed */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40 dark:bg-slate-950/40 relative"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/50 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-3 shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200 mb-1">
              Active ISL Conversation Window
            </h4>
            <p className="text-xs max-w-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              When the patient signs via camera, recognized ISL gestures appear on the{' '}
              <strong className="text-purple-600 dark:text-purple-400">left</strong>. Your ISL clip responses will feature on the{' '}
              <strong className="text-teal-600 dark:text-teal-400">right</strong>.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isPatient = msg.sender === 'patient'

            if (isPatient) {
              // LEFT SIDE - Patient's ISL Gesture Translated to Text
              const isAlert = msg.type === 'patient_alert'
              const confPct = msg.confidence !== undefined ? Math.round(msg.confidence * 100) : null

              return (
                <div key={msg.id} className="flex items-start gap-2.5 max-w-[85%] sm:max-w-[78%] group">
                  {/* Patient Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-xs border ${
                      isAlert
                        ? 'bg-red-500/15 border-red-500/30 text-red-500 dark:text-red-400'
                        : 'bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-300'
                    }`}
                  >
                    {isAlert ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-bold">🤟</span>
                    )}
                  </div>

                  {/* Message Container */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        {isAlert ? 'Patient Alert' : 'Patient (ISL)'}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>

                    {/* Chat Bubble */}
                    <div
                      className={`p-3 rounded-2xl rounded-tl-xs shadow-xs border transition-all ${
                        isAlert
                          ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-900 dark:text-red-100'
                          : 'bg-white dark:bg-slate-800/90 border-purple-200/60 dark:border-purple-500/30 text-slate-900 dark:text-white'
                      }`}
                    >
                      <p className="text-sm sm:text-base font-semibold leading-snug break-words">
                        &ldquo;{msg.text}&rdquo;
                      </p>

                      {/* Badge and action footer */}
                      <div className="flex items-center flex-wrap gap-2 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                        {isAlert ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded">
                            Bedside Alert Tap
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            ISL Recognized
                          </span>
                        )}

                        {confPct !== null && (
                          <span
                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                              confPct >= 80
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                                : confPct >= 60
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {confPct}% confidence
                          </span>
                        )}

                        {/* On-demand audio playback */}
                        <button
                          type="button"
                          onClick={() => speakText(msg.text)}
                          className="ml-auto text-[11px] text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium flex items-center gap-1 transition-colors"
                          title="Speak translation aloud"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span className="hidden sm:inline">Listen</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            } else {
              // RIGHT SIDE - Doctor/Staff Response using ISL Sign input
              return (
                <div key={msg.id} className="flex items-start justify-end gap-2.5 max-w-[85%] sm:max-w-[78%] ml-auto">
                  {/* Message Container */}
                  <div className="space-y-1 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(msg.timestamp)}
                      </span>
                      <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300">
                        Doctor / Staff
                      </span>
                    </div>

                    {/* Chat Bubble */}
                    <div className="p-3 rounded-2xl rounded-tr-xs shadow-md bg-gradient-to-r from-teal to-teal-700 text-white text-left">
                      <p className="text-sm sm:text-base font-semibold leading-snug break-words">
                        {msg.text}
                      </p>

                      {/* Outgoing metadata footer */}
                      <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-white/20 text-[10px] text-teal-100">
                        <span className="flex items-center gap-1 font-medium">
                          <PlayCircle className="w-3 h-3 text-teal-200" />
                          ISL Clip Broadcasted
                        </span>
                        <span className="flex items-center gap-0.5 font-bold" title="Delivered to tablet">
                          <CheckCheck className="w-3.5 h-3.5 text-teal-200" />
                          Delivered
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Avatar */}
                  <div className="w-8 h-8 rounded-full bg-teal border border-teal-400/40 text-teal-200 flex items-center justify-center shrink-0 shadow-xs mt-4">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                </div>
              )
            }
          })
        )}
        <div ref={messagesEndRef} />

        {/* Floating Scroll to Bottom Button */}
        {showScrollBottom && (
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="sticky bottom-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all animate-bounce border border-slate-700 z-10"
          >
            <ArrowDown className="w-3 h-3" />
            <span>Latest Messages</span>
          </button>
        )}
      </div>

      {/* Integrated Quick ISL Response Input (Directly below chat messages) */}
      {onSendISLPhrase && (
        <form
          onSubmit={handleSendMessage}
          className="p-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-shrink-0"
        >
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Quick reply with ISL sign (e.g. 'You are safe', 'Take medicine')..."
            className="h-9 text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isSearching || !chatInput.trim()}
            className="h-9 px-3 bg-teal hover:bg-teal-light text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
          >
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reply ISL</span>
              </>
            )}
          </Button>
        </form>
      )}
    </Card>
  )
}
