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
import { toast } from 'sonner'
import {
  INTERPRETER_REQUESTS_CHANNEL,
  REALTIME_EVENTS,
  getSessionChannel,
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
    toast.dismiss(`incoming-call-${req.sessionId}`)
    handledRequestsRef.current.delete(req.sessionId)
    toast.success(`Connecting to ${req.patientName}...`)

    const statusPayload = {
      type: 'status_change',
      sessionId: req.sessionId,
      newStatus: 'interpreter_connected',
      timestamp: new Date().toISOString(),
    }

    // 1. Local BroadcastChannel for same-machine tabs
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel(`ishara_session_${req.sessionId}`)
        bc.postMessage({
          type: REALTIME_EVENTS.STATUS_CHANGE,
          payload: statusPayload,
        })
        setTimeout(() => {
          try {
            bc.close()
          } catch {}
        }, 3000)
      }
    } catch {}

    // 2. Supabase Realtime Channel for remote devices
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const supabase = createClient()
        const sessChannel = supabase.channel(getSessionChannel(req.sessionId))
        sessChannel.subscribe((subStatus: string) => {
          if (subStatus === 'SUBSCRIBED') {
            sessChannel.send({
              type: 'broadcast',
              event: REALTIME_EVENTS.STATUS_CHANGE,
              payload: statusPayload,
            })
          }
        })
      }
    } catch {}

    // 3. Remove from pending requests
    setRequests((prev) => prev.filter((r) => r.id !== req.id))

    // 4. Atomically claim session in database
    try {
      const supabase = createClient()
      await supabase
        .from('sessions')
        .update({
          status: 'interpreter_connected',
          active_mode: 'live_interpreter',
          assigned_interpreter_id: user?.id || null,
        })
        .eq('id', req.sessionId)
    } catch {}

    // Also notify backend status endpoint
    fetch(`/api/session/${req.sessionId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'interpreter_connected',
        activeMode: 'live_interpreter',
      }),
    }).catch(() => {})

    // 5. Route to LiveKit WebRTC video call view
    router.push(`/interpreter/call/${req.sessionId}`)
  }

  const handleDeclineCall = (req: IncomingRequest) => {
    toast.dismiss(`incoming-call-${req.sessionId}`)
    setRequests((prev) => prev.filter((r) => r.id !== req.id))
  }

  const statusOptions: { value: 'available' | 'busy' | 'offline'; label: string; dot: string }[] = [
    { value: 'available', label: 'Available', dot: 'bg-success' },
    { value: 'busy', label: 'Busy', dot: 'bg-warning' },
    { value: 'offline', label: 'Offline', dot: 'bg-slate-400' },
  ]

  const displayName = user?.user_metadata?.full_name || user?.email || 'Certified ISL interpreter'
  const initials = displayName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase())
    .join('')

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-[1240px] mx-auto w-full px-4 sm:px-6 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="relative w-9 h-9 rounded-[10px] border border-border bg-white overflow-hidden shrink-0">
              <Image src="/logo.png" alt="" fill sizes="36px" className="object-contain p-1" priority />
            </span>
            <span className="font-heading font-bold text-[19px]">Ishara</span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-indigo-surface text-indigo-ink text-[13px] font-bold">
            Interpreter portal
          </span>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-full bg-indigo-surface text-indigo-ink font-bold text-sm flex items-center justify-center">
                {initials || 'IN'}
              </span>
              <span className="text-sm font-semibold max-w-[200px] truncate">{displayName}</span>
            </span>
            <Button
              variant="outline"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="h-10 w-10 p-0 rounded-[10px] border-input"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        {/* ───── Call queue ───── */}
        <div className="flex flex-col gap-5 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-indigo" />
              Incoming calls
            </h1>
            <span className="text-sm text-muted-foreground">
              {requests.length} waiting
            </span>
          </div>

          {requests.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-border bg-card/60 p-10 sm:p-14 text-center flex flex-col items-center gap-3">
              <span className="w-14 h-14 rounded-full bg-indigo-surface text-indigo-ink flex items-center justify-center">
                <Video className="w-6 h-6" />
              </span>
              <h2 className="font-heading font-semibold text-lg">No calls right now</h2>
              <p className="text-[15px] text-muted-foreground max-w-sm">
                {status === 'available'
                  ? 'When a ward pages an interpreter, the call rings here instantly. Keep this tab open to hear it.'
                  : 'Set yourself to Available to start receiving calls from wards.'}
              </p>
            </div>
          ) : (
            requests.map((req) => (
              <section
                key={req.id}
                role="alert"
                className="bg-card border-2 border-indigo rounded-3xl overflow-hidden animate-in fade-in"
              >
                <div className="p-5 sm:p-7 flex flex-wrap gap-6 items-center">
                  <span className="w-[88px] h-[88px] shrink-0 rounded-full bg-indigo-surface flex items-center justify-center">
                    <span className="w-16 h-16 rounded-full bg-indigo text-white flex items-center justify-center motion-safe:animate-pulse">
                      <PhoneCall className="w-7 h-7" />
                    </span>
                  </span>
                  <div className="flex-[1_1_260px] min-w-0 flex flex-col gap-1.5">
                    <span className="text-[13px] font-bold tracking-[0.08em] text-indigo-ink">INCOMING EMERGENCY ISL CALL</span>
                    <h2 className="font-heading font-bold text-[28px] sm:text-[34px] leading-[1.1]">{req.patientName}</h2>
                    <span className="text-base text-muted-foreground flex items-center gap-1.5">
                      <Building className="w-4 h-4" /> {req.hospitalName}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[13px] text-muted-foreground">Requested</span>
                    <span className="font-heading font-bold text-2xl text-indigo-ink tabular-nums flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> {req.requestedAt}
                    </span>
                  </div>
                </div>
                <div className="px-5 sm:px-7 py-4 bg-background border-t border-border flex flex-wrap gap-3 items-center">
                  <span className="text-xs font-mono text-muted-foreground">Session {req.sessionId.slice(0, 8)}</span>
                  <div className="ml-auto flex gap-2.5">
                    <Button
                      variant="outline"
                      onClick={() => handleDeclineCall(req)}
                      className="h-[52px] px-5 rounded-xl border-input font-semibold"
                    >
                      Decline
                    </Button>
                    <Button
                      onClick={() => handleAcceptCall(req)}
                      className="h-[52px] px-6 rounded-xl bg-indigo hover:bg-indigo-hover text-white font-bold gap-2"
                    >
                      <Video className="w-5 h-5" />
                      Accept &amp; join video
                    </Button>
                  </div>
                </div>
              </section>
            ))
          )}
        </div>

        {/* ───── Availability ───── */}
        <aside className="flex flex-col gap-5">
          <section className="bg-card border border-border rounded-[20px] p-6 flex flex-col gap-4">
            <h2 className="font-heading font-bold text-xl">Your availability</h2>
            <div role="radiogroup" aria-label="Availability" className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-muted">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={status === opt.value}
                  onClick={() => handleUpdateStatus(opt.value)}
                  className={`h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    status === opt.value ? 'bg-card text-foreground shadow-sm' : 'text-secondary-foreground hover:text-foreground'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                  {opt.label}
                </button>
              ))}
            </div>
            <p role="status" className="text-sm leading-relaxed text-muted-foreground">
              {status === 'available'
                ? 'You are in the relay pool. Calls ring with a two-tone chime.'
                : status === 'busy'
                ? 'Calls are paused while you are busy.'
                : 'You are offline and will not receive calls.'}
            </p>
          </section>

          <section className="bg-card border border-border rounded-[20px] p-6 flex flex-col gap-3">
            <h2 className="font-heading font-bold text-xl">When a call comes in</h2>
            <ol className="flex flex-col gap-2.5 text-[15px] text-secondary-foreground list-decimal pl-5">
              <li>Accept to join two-way video with the bedside tablet.</li>
              <li>The ward sees you connect immediately.</li>
              <li>End the call from the video screen when you are done.</li>
            </ol>
          </section>
        </aside>
      </div>
    </main>
  )
}
