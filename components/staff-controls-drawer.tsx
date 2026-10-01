'use client'

import React, { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Mic,
  MicOff,
  Send,
  Video,
  ChevronUp,
  Stethoscope,
  Sparkles,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { searchClips, getClipByKey, getClipUrl } from '@/lib/isl-clips'
import { toast } from 'sonner'

interface StaffControlsDrawerProps {
  sessionId: string
  onRequestInterpreter: () => void
  onPlayClip: (clipKey: string, clipUrl: string, label: string) => void
  isInterpreterConnected?: boolean
}

const QUICK_DOCTOR_PHRASES = [
  { label: 'You are safe', key: 'you-are-safe' },
  { label: 'We are helping you', key: 'we-are-helping' },
  { label: 'Take this medicine', key: 'take-medicine' },
  { label: 'Stay still', key: 'stay-still' },
  { label: 'Relax / breathe', key: 'relax' },
  { label: 'Do you agree?', key: 'do-you-agree' },
]

export function StaffControlsDrawer({
  sessionId,
  onRequestInterpreter,
  onPlayClip,
  isInterpreterConnected = false,
}: StaffControlsDrawerProps) {
  const [open, setOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [interpreterPaging, setInterpreterPaging] = useState(false)

  const {
    isSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition()

  // Update input text if speech recognition produced text
  React.useEffect(() => {
    if (transcript) {
      setInputText(transcript)
    }
  }, [transcript])

  const handleToggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      startListening()
      toast.info('Listening to clinical dictation...')
    }
  }

  const handleSendPhrase = async (phraseToSend?: string, phraseKey?: string) => {
    const query = phraseToSend || inputText.trim()
    if (!query && !phraseKey) return

    setIsSearching(true)
    try {
      let bestClip: any = null
      let clipUrl: string = ''

      // 1. Try API lookup first for server-signed Supabase URL
      try {
        const res = await fetch('/api/isl-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(phraseKey ? { key: phraseKey } : { query }),
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
        if (phraseKey) {
          const matched = getClipByKey(phraseKey)
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
        toast.success(`Broadcasting ISL clip "${bestClip.label}" to patient tablet`)
        onPlayClip(bestClip.key, clipUrl, bestClip.label)
        setInputText('')
        resetTranscript()
      } else {
        toast.error(`No matching ISL clip found for "${query || phraseKey}". Try requesting an interpreter.`)
      }
    } catch {
      toast.error('Failed to lookup ISL sign')
    } finally {
      setIsSearching(false)
    }
  }

  const handleRequestInterpreterClick = () => {
    setInterpreterPaging(true)
    onRequestInterpreter()
    toast.info('Paging next available ISL interpreter...')
    setTimeout(() => setInterpreterPaging(false), 3000)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 bg-teal text-white px-4 py-3 rounded-full shadow-2xl border-2 border-teal-300/40 flex items-center gap-2 hover:bg-teal-light active:scale-95 transition-all text-sm font-bold cursor-pointer">
        <Stethoscope className="w-5 h-5 text-teal-200" />
        <span>Doctor / Staff Bedside Drawer</span>
        <ChevronUp className="w-4 h-4" />
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="max-h-[85vh] sm:max-h-[75vh] bg-white dark:bg-slate-900 rounded-t-3xl border-t-4 border-teal p-4 sm:p-6 overflow-y-auto"
      >
        <SheetHeader className="text-left mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-6 h-6 text-teal dark:text-teal-400" />
              <SheetTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Bedside Clinician Controls
              </SheetTitle>
            </div>
            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
              Session: {sessionId.slice(0, 8)}...
            </span>
          </div>
          <SheetDescription className="text-xs text-slate-500">
            Communicate with the patient using AI-matched ISL video clips or connect a live interpreter.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          {/* 1. Request Live Interpreter (P1) */}
          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Primary Channel (P1)
              </span>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                Live Indian Sign Language Interpreter
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Connect a certified remote human interpreter over real-time video.
              </p>
            </div>

            <Button
              onClick={handleRequestInterpreterClick}
              disabled={interpreterPaging || isInterpreterConnected}
              className={`
                shrink-0 font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md
                ${isInterpreterConnected
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-indigo hover:bg-indigo-hover text-white'
                }
              `}
            >
              {interpreterPaging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Paging Interpreter...
                </>
              ) : isInterpreterConnected ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Interpreter Connected
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  Request Live Interpreter
                </>
              )}
            </Button>
          </div>

          {/* 2. Speak or Type to Sign (P2 Fallback) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600" />
                Speak or Type to Display ISL Video
              </label>
              {isListening && (
                <span className="text-xs font-bold text-red-600 animate-pulse flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
                  Recording voice...
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
                  aria-label={isListening ? 'Stop recording' : 'Start voice dictation'}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-teal" />}
                </Button>
              )}

              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendPhrase()}
                placeholder="e.g. 'You are safe', 'Take this pill', 'Where is the pain?'"
                className="h-12 text-base rounded-xl border-slate-300 dark:border-slate-700 flex-1"
              />

              <Button
                onClick={() => handleSendPhrase()}
                disabled={isSearching || !inputText.trim()}
                className="h-12 px-5 bg-teal hover:bg-teal-light text-white rounded-xl shrink-0 font-bold"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>

            {/* Quick phrase chips */}
            <div>
              <span className="text-xs font-semibold text-slate-500 block mb-1.5">
                Quick Doctor Phrases (Click to play ISL video for patient):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_DOCTOR_PHRASES.map((phrase) => (
                  <button
                    key={phrase.key}
                    type="button"
                    onClick={() => handleSendPhrase(phrase.label, phrase.key)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal hover:border-teal-300 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    + {phrase.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
