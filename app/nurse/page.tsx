'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ExternalLink,
  Footprints,
  Hand,
  LayoutGrid,
  Loader2,
  MousePointerClick,
  RefreshCw,
} from 'lucide-react'
import { onNurseStationPing, broadcastRequestStatus } from '@/lib/nurse-realtime'
import type { NurseRequest, RequestStatus } from '@/lib/nurse-requests'

const POLL_MS = 20_000

type View = 'open' | 'done'

function timeAgo(iso: string, now: number) {
  const secs = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (secs < 45) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  return `${hours} h ago`
}

/** A soft two-note chime for routine requests (urgent ones also ring on the doctor console). */
function playRequestChime(urgent: boolean) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const notes = urgent ? [880, 660, 880] : [660, 880]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = ctx.currentTime + i * 0.18
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(urgent ? 0.25 : 0.12, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.4)
    })
    setTimeout(() => ctx.close().catch(() => {}), 1500)
  } catch {}
}

export default function NurseStationPage() {
  const [requests, setRequests] = useState<NurseRequest[]>([])
  const [hospitalName, setHospitalName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [view, setView] = useState<View>('open')
  const [soundOn, setSoundOn] = useState(true)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [now, setNow] = useState(() => Date.now())

  const knownIds = useRef<Set<string> | null>(null)
  const soundOnRef = useRef(soundOn)
  useEffect(() => {
    soundOnRef.current = soundOn
  }, [soundOn])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/nurse/requests', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load requests')
      const next: NurseRequest[] = data.requests ?? []

      // Chime for requests that arrived since the last load (not on first load)
      if (knownIds.current) {
        const fresh = next.filter((r) => !knownIds.current!.has(r.id) && r.status === 'new')
        if (fresh.length && soundOnRef.current) playRequestChime(fresh.some((r) => r.isUrgent))
        if (fresh.length) {
          const first = fresh[0]
          toast(`${first.bedLabel}: ${first.label}`, {
            description: fresh.length > 1 ? `and ${fresh.length - 1} more` : 'New patient request',
          })
        }
      }
      knownIds.current = new Set(next.map((r) => r.id))

      setRequests(next)
      setHospitalName(data.hospitalName ?? null)
      setLoadError(null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load requests')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load, realtime pings, polling fallback and a clock for "x min ago"
  useEffect(() => {
    load()
    const unsubscribe = onNurseStationPing(() => load())
    const poll = setInterval(load, POLL_MS)
    const clock = setInterval(() => setNow(Date.now()), 30_000)
    return () => {
      unsubscribe()
      clearInterval(poll)
      clearInterval(clock)
    }
  }, [load])

  const setStatus = async (req: NurseRequest, status: RequestStatus) => {
    const previous = req.status
    setPending((p) => new Set(p).add(req.id))
    setRequests((list) => list.map((r) => (r.id === req.id ? { ...r, status, statusAt: new Date().toISOString() } : r)))
    try {
      const res = await fetch(`/api/nurse/requests/${req.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not update request')
      broadcastRequestStatus({
        type: 'request_status',
        sessionId: req.sessionId,
        requestEventId: req.id,
        status,
        label: req.label,
        timestamp: new Date().toISOString(),
      })
      toast.success(status === 'acknowledged' ? `${req.bedLabel} told a nurse is on the way` : `${req.bedLabel}: ${req.label} done`)
    } catch (error) {
      setRequests((list) => list.map((r) => (r.id === req.id ? { ...r, status: previous } : r)))
      toast.error(error instanceof Error ? error.message : 'Could not update request')
    } finally {
      setPending((p) => {
        const next = new Set(p)
        next.delete(req.id)
        return next
      })
    }
  }

  const counts = useMemo(
    () => ({
      new: requests.filter((r) => r.status === 'new').length,
      acknowledged: requests.filter((r) => r.status === 'acknowledged').length,
      done: requests.filter((r) => r.status === 'done').length,
    }),
    [requests]
  )

  const visible = useMemo(() => {
    const list = requests.filter((r) => (view === 'open' ? r.status !== 'done' : r.status === 'done'))
    if (view === 'done') return list
    // Urgent first, then new before acknowledged, then oldest first so nothing waits too long
    const rank = (r: NurseRequest) => (r.isUrgent ? 0 : 2) + (r.status === 'new' ? 0 : 1)
    return [...list].sort((a, b) => rank(a) - rank(b) || a.createdAt.localeCompare(b.createdAt))
  }, [requests, view])

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-[1240px] mx-auto w-full px-4 sm:px-6 py-3 flex items-center gap-4 flex-wrap">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Ishara home">
            <span className="relative w-9 h-9 rounded-[10px] border border-border bg-white overflow-hidden shrink-0">
              <Image src="/logo-mark.png" alt="" fill sizes="36px" className="object-contain p-1" priority />
            </span>
            <span className="font-heading font-bold text-[19px]">Ishara</span>
          </Link>
          <span className="hidden sm:block h-6 w-px bg-border" />
          <span className="text-[15px] font-semibold text-secondary-foreground">
            Nurse station{hospitalName ? ` · ${hospitalName}` : ''}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <span role="status" className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-surface text-[13px] font-semibold text-success-ink">
              <span className="w-2 h-2 rounded-full bg-success" />
              Live
            </span>
            <button
              type="button"
              onClick={() => setSoundOn((s) => !s)}
              aria-pressed={soundOn}
              aria-label={soundOn ? 'Mute new-request chime' : 'Turn on new-request chime'}
              className="h-10 w-10 rounded-[10px] border border-input bg-card text-secondary-foreground flex items-center justify-center hover:text-foreground"
            >
              {soundOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => load()}
              aria-label="Refresh requests"
              className="h-10 w-10 rounded-[10px] border border-input bg-card text-secondary-foreground flex items-center justify-center hover:text-foreground"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link
              href="/dashboard"
              className="h-10 px-3.5 rounded-[10px] border border-input bg-card text-sm font-semibold flex items-center gap-1.5 hover:border-teal"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Bed roster</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {/* Summary + view switch */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading font-bold text-[28px] leading-tight">Patient requests</h1>
            <p className="text-[15px] text-muted-foreground">Every tap and sign from bedside tablets in the last 24 hours.</p>
          </div>
          <dl className="flex gap-2.5">
            <div className="px-4 py-2.5 rounded-[14px] bg-card border border-border flex flex-col-reverse">
              <dt className="text-[13px] text-muted-foreground">New</dt>
              <dd className="font-heading font-bold text-2xl tabular-nums">{counts.new}</dd>
            </div>
            <div className="px-4 py-2.5 rounded-[14px] bg-card border border-border flex flex-col-reverse">
              <dt className="text-[13px] text-muted-foreground">On the way</dt>
              <dd className="font-heading font-bold text-2xl tabular-nums">{counts.acknowledged}</dd>
            </div>
            <div className="px-4 py-2.5 rounded-[14px] bg-card border border-border flex flex-col-reverse">
              <dt className="text-[13px] text-muted-foreground">Done</dt>
              <dd className="font-heading font-bold text-2xl tabular-nums">{counts.done}</dd>
            </div>
          </dl>
        </div>

        <div role="tablist" aria-label="Request view" className="self-start grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-muted">
          {(
            [
              ['open', `Open (${counts.new + counts.acknowledged})`],
              ['done', `Done (${counts.done})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={view === value}
              onClick={() => setView(value)}
              className={`h-11 px-5 rounded-xl text-sm font-semibold transition-colors ${
                view === value ? 'bg-card text-foreground shadow-sm' : 'text-secondary-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loadError && (
          <div role="alert" className="rounded-2xl border-2 border-emergency bg-emergency-surface text-emergency-ink px-4 py-3 text-sm font-semibold">
            {loadError}. Retrying automatically.
          </div>
        )}

        {/* Request list */}
        {loading ? (
          <div className="py-20 flex justify-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-border bg-card/60 p-12 text-center flex flex-col items-center gap-3">
            <span className="w-14 h-14 rounded-full bg-teal-surface text-teal-ink flex items-center justify-center">
              <CheckCheck className="w-6 h-6" />
            </span>
            <h2 className="font-heading font-semibold text-lg">
              {view === 'open' ? 'All caught up' : 'Nothing marked done yet'}
            </h2>
            <p className="text-[15px] text-muted-foreground max-w-sm">
              {view === 'open'
                ? 'New requests from bedside tablets appear here instantly, with a chime.'
                : 'Requests you complete move here.'}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3" aria-live="polite">
            {visible.map((req) => {
              const busy = pending.has(req.id)
              return (
                <li
                  key={req.id}
                  className={`rounded-[20px] bg-card p-4 sm:p-5 flex flex-wrap items-center gap-4 ${
                    req.isUrgent && req.status !== 'done' ? 'border-2 border-emergency' : 'border border-border'
                  }`}
                >
                  {/* Bed */}
                  <div
                    className={`w-[88px] shrink-0 rounded-2xl px-3 py-2.5 text-center ${
                      req.isUrgent ? 'bg-emergency-surface text-emergency-ink' : 'bg-teal-surface text-teal-ink'
                    }`}
                  >
                    <span className="block font-heading font-bold text-lg leading-tight break-words">{req.bedLabel}</span>
                  </div>

                  {/* Request */}
                  <div className="flex-[1_1_260px] min-w-0 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {req.isUrgent && (
                        <span className="px-1.5 py-0.5 rounded-[4px] bg-emergency text-white text-[11px] font-bold tracking-[0.06em]">
                          URGENT
                        </span>
                      )}
                      <span className="font-heading font-bold text-xl">{req.label}</span>
                      {req.hindi && (
                        <span lang="hi" className="text-[15px] text-muted-foreground">
                          {req.hindi}
                        </span>
                      )}
                    </div>
                    {req.detail && <span className="text-[15px] font-semibold text-secondary-foreground">{req.detail}</span>}
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {req.source === 'sign' ? <Hand className="w-3.5 h-3.5" /> : <MousePointerClick className="w-3.5 h-3.5" />}
                        {req.source === 'sign' ? 'Signed to camera' : 'Tapped on tablet'}
                      </span>
                      <span className="tabular-nums">{timeAgo(req.createdAt, now)}</span>
                      {req.patientName && <span className="truncate">{req.patientName}</span>}
                      {req.status === 'acknowledged' && (
                        <span className="flex items-center gap-1 font-semibold text-indigo-ink">
                          <Footprints className="w-3.5 h-3.5" /> Nurse on the way
                        </span>
                      )}
                      {req.status === 'done' && req.statusAt && (
                        <span className="flex items-center gap-1 font-semibold text-success-ink">
                          <Check className="w-3.5 h-3.5" /> Done {timeAgo(req.statusAt, now)}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 ml-auto">
                    {req.isUrgent && req.status !== 'done' && (
                      <Link
                        href={`/dashboard/${req.sessionId}`}
                        className="h-12 px-4 rounded-[10px] border border-input bg-card text-sm font-semibold flex items-center gap-1.5 hover:border-teal"
                      >
                        <ExternalLink className="w-4 h-4" /> Open bed
                      </Link>
                    )}
                    {req.status === 'new' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setStatus(req, 'acknowledged')}
                        className="h-12 px-5 rounded-[10px] bg-teal hover:bg-teal-light text-white font-semibold flex items-center gap-2 disabled:opacity-60 transition-colors"
                      >
                        <Footprints className="w-4 h-4" /> On my way
                      </button>
                    )}
                    {req.status !== 'done' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setStatus(req, 'done')}
                        className={`h-12 px-5 rounded-[10px] font-semibold flex items-center gap-2 disabled:opacity-60 transition-colors ${
                          req.status === 'acknowledged'
                            ? 'bg-teal hover:bg-teal-light text-white'
                            : 'border border-input bg-card hover:border-teal'
                        }`}
                      >
                        <Check className="w-4 h-4" /> Mark done
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
