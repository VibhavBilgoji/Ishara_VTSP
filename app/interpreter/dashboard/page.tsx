'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Clock,
  Building,
  PhoneCall,
  LogOut,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  INTERPRETER_REQUESTS_CHANNEL,
  REALTIME_EVENTS,
} from '@/lib/realtime'
import { createClient } from '@/lib/supabase/client'

interface IncomingRequest {
  id: string
  sessionId: string
  hospitalName: string
  patientName: string
  requestedAt: string
}

function playIncomingCallRing() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const now = ctx.currentTime

    // Standard high-priority two-tone emergency ring (853Hz + 960Hz)
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(853, now)
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(960, now)

    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.8)
    osc2.stop(now + 0.8)
  } catch {}
}

export default function InterpreterDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [status, setStatus] = useState<'available' | 'busy' | 'offline'>('available')
  const [requests, setRequests] = useState<IncomingRequest[]>([])
  const handledRequestsRef = useRef<Map<string, number>>(new Map())

  // Load authenticated user and verify session
  useEffect(() => {
    async function loadUserAndPresence() {
      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          router.push('/auth/interpreter')
          return
        }
        setUser(authUser)

        // Fetch current presence status
        const { data } = await supabase
          .from('interpreter_presence')
          .select('status')
          .eq('interpreter_id', authUser.id)
          .single()

        if (data?.status) {
          setStatus(data.status as any)
        }
      } catch {}
    }

    loadUserAndPresence()
  }, [router])

  // Update presence status in database
  const handleUpdateStatus = async (newStatus: 'available' | 'busy' | 'offline') => {
    setStatus(newStatus)
    if (!user) return

    try {
      const supabase = createClient()
      await supabase.from('interpreter_presence').upsert({
        interpreter_id: user.id,
        status: newStatus,
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      toast.success(`Availability updated to ${newStatus}`)
    } catch {
      toast.error('Failed to update presence status in database')
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleNewRequest = React.useCallback((payload: any) => {
    const sessId = payload?.sessionId || '00000000-0000-0000-0000-000000000001'
    const now = Date.now()
    const lastSeen = handledRequestsRef.current.get(sessId) || 0

    // Suppress duplicates within 6 seconds
    if (now - lastSeen < 6000) {
      return
    }
    handledRequestsRef.current.set(sessId, now)

    const req: IncomingRequest = {
      id: payload?.id || `req-${sessId}`,
      sessionId: sessId,
      hospitalName: payload?.hospitalName || 'Apollo Multi-Specialty Hospital',
      patientName: payload?.patientName || 'Bedside Patient (ISL)',
      requestedAt: new Date().toLocaleTimeString(),
    }

    // Play ringtone and show singleton toast outside state updater
    playIncomingCallRing()
    toast.error(`🚨 Incoming Emergency ISL Call from ${req.hospitalName}!`, {
      id: `incoming-call-${sessId}`,
      duration: 15000,
    })

    setRequests((prev) => {
      // Deduplicate: ignore duplicate triggers for the same active session
      if (prev.some((r) => r.sessionId === req.sessionId)) {
        return prev
      }
      return [req, ...prev]
    })
  }, [])

  const handleCancelRequest = React.useCallback((payload: any) => {
    const cancelSessId = payload?.sessionId
    if (!cancelSessId) return

    toast.dismiss(`incoming-call-${cancelSessId}`)
    handledRequestsRef.current.delete(cancelSessId)

    setRequests((prev) => {
      const match = prev.find((r) => r.sessionId === cancelSessId)
      if (match) {
        toast.info(`Emergency call from ${match.patientName} was cancelled by hospital`, {
          id: `cancelled-call-${cancelSessId}`,
        })
      }
      return prev.filter((r) => r.sessionId !== cancelSessId)
    })
  }, [])

  useEffect(() => {
    // 1. Listen on local BroadcastChannel
    let bc: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('ishara_global_interpreter_requests')
        bc.onmessage = (event) => {
          if (event.data?.type === 'new_request') {
            handleNewRequest(event.data.payload)
          } else if (event.data?.type === 'cancel_request') {
            handleCancelRequest(event.data.payload)
          }
        }
      }
    } catch {}

    // 2. Listen on Supabase Realtime channel
    let supabase: any = null
    let channel: any = null

    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        supabase = createClient()
        channel = supabase.channel(INTERPRETER_REQUESTS_CHANNEL)
        channel
          .on('broadcast', { event: REALTIME_EVENTS.NEW_REQUEST }, (response: any) => {
            handleNewRequest(response.payload)
          })
          .on('broadcast', { event: REALTIME_EVENTS.CANCEL_REQUEST }, (response: any) => {
            handleCancelRequest(response.payload)
          })
          .subscribe()
      }
    } catch {}

    return () => {
      if (bc) bc.close()
      if (channel && supabase) supabase.removeChannel(channel)
    }
  }, [handleNewRequest, handleCancelRequest])

  const handleAcceptCall = async (req: IncomingRequest) => {
    try {
      const response = await fetch(`/api/session/${req.sessionId}/claim`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not accept call')
      toast.dismiss(`incoming-call-${req.sessionId}`)
      handledRequestsRef.current.delete(req.sessionId)
      setRequests((prev) => prev.filter((request) => request.id !== req.id))
      // Same-device tabs still receive the confirmed server status.
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel(`ishara_session_${req.sessionId}`)
        channel.postMessage({ type: REALTIME_EVENTS.STATUS_CHANGE, payload: {
          type: 'status_change', sessionId: req.sessionId, newStatus: 'interpreter_connected', timestamp: new Date().toISOString(),
        } })
        channel.close()
      }
      toast.success(`Connecting to ${req.patientName}...`)
      router.push(`/interpreter/call/${req.sessionId}`)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not accept call') }
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
              <Image src="/logo.png" alt="Ishara Logo" fill sizes="36px" className="object-contain p-1" priority />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-[#4F46E5] dark:text-indigo-400">
                  Ishara Interpreter Portal
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                  Certified ISL Relay
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Logged in as {user?.user_metadata?.full_name || user?.email || 'Ananya Deshmukh (Certified ISL)'}
              </p>
            </div>
          </div>

          {/* Status Toggle & Logout */}
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleUpdateStatus('available')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  status === 'available'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                ● Available
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus('busy')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  status === 'busy'
                    ? 'bg-amber-500 text-white shadow'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Busy
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus('offline')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  status === 'offline'
                    ? 'bg-slate-600 text-white shadow'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Offline
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="h-9 px-2.5 text-xs text-slate-600 border-slate-300 dark:border-slate-700"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
        {/* Availability Banner */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
            status === 'available'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-950 dark:text-emerald-200'
              : status === 'busy'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 text-amber-950 dark:text-amber-200'
              : 'bg-slate-100 dark:bg-slate-900 border-slate-300 text-slate-700 dark:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-3.5 h-3.5 rounded-full ${
                status === 'available'
                  ? 'bg-emerald-500 animate-pulse'
                  : status === 'busy'
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
              }`}
            />
            <div>
              <h3 className="font-black text-sm sm:text-base">
                {status === 'available'
                  ? 'You are Online & Available in the Relay Pool'
                  : status === 'busy'
                  ? 'You are Marked Busy (Calls Paused)'
                  : 'You are Currently Offline'}
              </h3>
              <p className="text-xs opacity-80">
                {status === 'available'
                  ? 'Standing by for incoming emergency hospital calls. Keep this tab open to hear audio rings.'
                  : 'Toggle your status to "Available" when you are ready to receive video triage calls.'}
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-white/70 dark:bg-slate-800/70 border">
            {requests.length} Active Queue
          </span>
        </div>

        {/* Incoming Calls Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#4F46E5]" />
              Incoming Hospital Call Queue
            </h2>
            <span className="text-xs text-slate-500">Live WebRTC dispatch stream</span>
          </div>

          {requests.length === 0 ? (
            <Card className="border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
              <CardContent className="p-10 text-center space-y-2">
                <Video className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                <h4 className="text-sm font-bold text-slate-600 dark:text-slate-400">
                  No Emergency Calls in Queue
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When a patient or triage nurse taps &ldquo;Request Live ISL Interpreter&rdquo; at any hospital bedside, the call will ring here instantly.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <Card
                  key={req.id}
                  className="border-2 border-indigo-400 dark:border-indigo-600 shadow-md bg-white dark:bg-slate-900 overflow-hidden animate-in fade-in"
                >
                  <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-[#4F46E5] flex items-center justify-center shrink-0 shadow-inner">
                        <PhoneCall className="w-6 h-6 animate-bounce" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 animate-pulse">
                            EMERGENCY ISL RELAY
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" /> {req.requestedAt}
                          </span>
                        </div>

                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                          {req.patientName}
                        </h3>

                        <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {req.hospitalName} • Session: <span className="font-mono text-slate-500">{req.sessionId.slice(0, 8)}...</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button
                        onClick={() => handleAcceptCall(req)}
                        className="w-full sm:w-auto bg-[#4F46E5] hover:bg-[#4338CA] text-white font-black text-xs sm:text-sm h-11 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-500/25 transition-all"
                      >
                        <Video className="w-4 h-4" />
                        <span>Accept Call & Join Video</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
