'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Stethoscope,
  Plus,
  QrCode,
  ExternalLink,
  LogOut,
  RefreshCw,
  Clock,
  Bed,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog } from '@base-ui/react/dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { KioskPairing } from '@/components/kiosk-pairing'
import { EmergencyAlertBanner } from '@/components/emergency-alert-banner'
import { AudioAlarmBanner } from '@/components/audio-alarm-banner'
import {
  HOSPITAL_ALERTS_CHANNEL,
  GLOBAL_HOSPITAL_ALERTS_BC,
  INTERPRETER_REQUESTS_CHANNEL,
  REALTIME_EVENTS,
} from '@/lib/realtime'
import type { PictogramAlertPayload } from '@/lib/types'

interface BedSession {
  id: string
  hospital_id: string
  patient_display_name: string
  status: string
  active_mode: string
  created_at: string
}

export default function HospitalRosterPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [sessions, setSessions] = useState<BedSession[]>([])
  const [loading, setLoading] = useState(true)

  // Admission Modal State
  const [isAdmitOpen, setIsAdmitOpen] = useState(false)
  const [patientName, setPatientName] = useState('')
  const [bedLabel, setBedLabel] = useState('')
  const [hospitalName, setHospitalName] = useState('Hospital')
  const [priority, setPriority] = useState('P0')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // QR Modal State
  const [isQROpen, setIsQROpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<BedSession | null>(null)

  // Realtime Hospital-wide Emergency Alerts
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState<PictogramAlertPayload | null>(null)

  // Subscribe to hospital-wide emergency alerts from any patient tablet
  useEffect(() => {
    // 1. Local BroadcastChannel for instant local / multi-tab alert detection
    let localBC: BroadcastChannel | null = null
    let interpBC: BroadcastChannel | null = null
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        localBC = new BroadcastChannel(GLOBAL_HOSPITAL_ALERTS_BC)
        localBC.onmessage = (event) => {
          const { type, payload } = event.data || {}
          if (type === REALTIME_EVENTS.EMERGENCY_ALERT && payload) {
            setActiveEmergencyAlert(payload)
            toast.error(`🚨 EMERGENCY ALERT: ${payload.patientName || 'Bedside'} — ${payload.label}`)
          }
        }

        interpBC = new BroadcastChannel('ishara_global_interpreter_requests')
        interpBC.onmessage = (event) => {
          const { type, payload } = event.data || {}
          if (type === 'new_request' && payload?.sessionId) {
            setSessions((prev) =>
              prev.map((s) => (s.id === payload.sessionId ? { ...s, status: 'interpreter_requested' } : s))
            )
          } else if (type === 'cancel_request' && payload?.sessionId) {
            setSessions((prev) =>
              prev.map((s) => (s.id === payload.sessionId ? { ...s, status: 'active' } : s))
            )
          }
        }
      }
    } catch {}

    // 2. Supabase Realtime channel for remote devices
    let supabase: any = null
    let alertChannel: any = null
    let interpChannel: any = null
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        supabase = createClient()
        alertChannel = supabase.channel(HOSPITAL_ALERTS_CHANNEL)
        alertChannel
          .on(
            'broadcast',
            { event: REALTIME_EVENTS.EMERGENCY_ALERT },
            ({ payload }: { payload: PictogramAlertPayload }) => {
              if (payload) {
                setActiveEmergencyAlert(payload)
                toast.error(`🚨 EMERGENCY ALERT: ${payload.patientName || 'Bedside'} — ${payload.label}`)
              }
            }
          )
          .subscribe()

        interpChannel = supabase.channel(INTERPRETER_REQUESTS_CHANNEL)
        interpChannel
          .on('broadcast', { event: REALTIME_EVENTS.NEW_REQUEST }, ({ payload }: any) => {
            if (payload?.sessionId) {
              setSessions((prev) =>
                prev.map((s) => (s.id === payload.sessionId ? { ...s, status: 'interpreter_requested' } : s))
              )
            }
          })
          .on('broadcast', { event: REALTIME_EVENTS.CANCEL_REQUEST }, ({ payload }: any) => {
            if (payload?.sessionId) {
              setSessions((prev) =>
                prev.map((s) => (s.id === payload.sessionId ? { ...s, status: 'active' } : s))
              )
            }
          })
          .subscribe()
      }
    } catch {}

    return () => {
      if (localBC) localBC.close()
      if (interpBC) interpBC.close()
      if (alertChannel && supabase) supabase.removeChannel(alertChannel)
      if (interpChannel && supabase) supabase.removeChannel(interpChannel)
    }
  }, [])

  // Fetch current user and active verified sessions
  const fetchRoster = React.useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        router.push('/auth/hospital')
        return
      }
      setUser(authUser)

      const res = await fetch('/api/session?list=true', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load hospital beds')
      setSessions(data.sessions)
      setHospitalName(data.hospital.name)

    } catch {
      toast.error('Could not load hospital beds')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchRoster()

    // Continuously verify and poll bed triage statuses every 10 seconds
    const pollInterval = setInterval(() => {
      fetchRoster()
    }, 10000)

    return () => clearInterval(pollInterval)
  }, [fetchRoster])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleAdmitPatient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientName.trim()) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bedLabel,
          patientDisplayName: `${patientName.trim()} (${priority})`,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not admit patient')
      if (data.session) {
        toast.success(`Admitted ${data.session.patient_display_name} successfully!`)
        setSessions((prev) => [data.session, ...prev])
        setIsAdmitOpen(false)
        setPatientName('')
        setBedLabel('')

        // Open QR code immediately so nurse can pair tablet
        setSelectedSession(data.session)
        setIsQROpen(true)
      }
    } catch {
      toast.error('Failed to create bedside session.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDischarge = async (sessionId: string, patientName: string) => {
    if (!confirm(`Are you sure you want to discharge "${patientName}" and close this bed?`)) {
      return
    }
    try {
      const response = await fetch(`/api/session/${sessionId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      if (!response.ok) throw new Error('Discharge failed')
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      toast.success(`${patientName} discharged successfully`)
    } catch {
      toast.error('Failed to discharge patient')
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
              <Image src="/logo-mark.png" alt="Ishara Logo" fill sizes="36px" className="object-contain" priority />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-teal dark:text-teal-300">
                  {hospitalName}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  Staff Station
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Logged in as {user?.user_metadata?.full_name || user?.email || 'Dr. Rajesh Sharma'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsAdmitOpen(true)}
              className="bg-teal hover:bg-teal-light text-white font-bold text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>+ Admit Bedside Patient</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="h-9 px-2.5 text-xs text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <AudioAlarmBanner />

        {/* Urgent Emergency Alert Banner for Doctor (Hospital-wide) */}
        {activeEmergencyAlert && (
          <EmergencyAlertBanner
            alert={activeEmergencyAlert}
            patientDisplayName={activeEmergencyAlert.patientName}
            onAcknowledge={() => setActiveEmergencyAlert(null)}
            onOpenConsole={(sid) => router.push(`/dashboard/${sid}`)}
          />
        )}

        {/* Hospital Inpatient Census Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 text-teal dark:text-teal-300">
              <Bed className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                Hospital Inpatient Census
              </span>
              <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {sessions.length} Active {sessions.length === 1 ? 'Bed' : 'Beds'} Under Clinical Care
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRoster}
              className="text-xs font-bold flex items-center gap-1.5 h-8 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Bedside Triage Roster Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal dark:text-teal-400" />
                Bedside Patient Triage Roster
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live monitoring across all active hospital beds and paired ISL tablet kiosks
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              Loading hospital bed roster...
            </div>
          ) : sessions.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2">
              <p className="text-sm text-slate-500">No active beds admitted yet.</p>
              <Button
                onClick={() => setIsAdmitOpen(true)}
                className="mt-3 bg-teal text-white text-xs font-bold h-9"
              >
                + Admit First Patient
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.map((sess) => {
                const isRequested = sess.status === 'interpreter_requested'
                const isConnected = sess.status === 'interpreter_connected'
                const isEmergencyActive = activeEmergencyAlert?.sessionId === sess.id

                return (
                  <Card
                    key={sess.id}
                    className={`border-2 transition-all rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs ${
                      isEmergencyActive
                        ? 'border-red-500 ring-2 ring-red-500/50 shadow-md shadow-red-500/20 animate-pulse'
                        : 'border-slate-200 dark:border-slate-800 hover:border-teal-500'
                    }`}
                  >
                    <CardContent className="p-4 sm:p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${isEmergencyActive ? 'bg-red-600 animate-ping' : 'bg-emerald-500'}`} />
                            <h3 className="font-bold text-base text-slate-900 dark:text-white">
                              {sess.patient_display_name}
                            </h3>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                            ID: {sess.id.slice(0, 18)}...
                          </span>
                        </div>

                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            isEmergencyActive
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 animate-bounce'
                              : isConnected
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200'
                              : isRequested
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 animate-pulse'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200'
                          }`}
                        >
                          {isEmergencyActive
                            ? `🚨 ${activeEmergencyAlert.label}`
                            : isConnected
                            ? '🎥 Interpreter Live'
                            : isRequested
                            ? '⏳ Interpreter Paged'
                            : '⚡ Active Triage'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            Admitted: {(() => {
                              try {
                                const d = new Date(sess.created_at)
                                const isToday = new Date().toDateString() === d.toDateString()
                                return isToday
                                  ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              } catch {
                                return sess.created_at
                              }
                            })()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSession(sess)
                              setIsQROpen(true)
                            }}
                            className="h-8 px-2.5 text-xs font-bold border-slate-300 flex items-center gap-1"
                          >
                            <QrCode className="w-3.5 h-3.5 text-teal-700" />
                            Pair Tablet
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => router.push(`/dashboard/${sess.id}`)}
                            className={`h-8 px-3 text-xs font-bold text-white flex items-center gap-1 shadow ${
                              isEmergencyActive
                                ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                                : 'bg-teal hover:bg-teal-light'
                            }`}
                          >
                            <span>Open Console</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDischarge(sess.id, sess.patient_display_name)}
                            className="h-8 px-2 text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
                            title={`Discharge ${sess.patient_display_name} / Close Bed`}
                            aria-label={`Discharge ${sess.patient_display_name}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 1. Admit Bedside Patient Modal */}
      <Dialog.Root open={isAdmitOpen} onOpenChange={setIsAdmitOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-in fade-in" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-2xl z-50 space-y-4">
            <button
              type="button"
              onClick={() => setIsAdmitOpen(false)}
              aria-label="Close dialog"
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <Dialog.Title className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-teal dark:text-teal-400" />
              Admit New Bedside Patient
            </Dialog.Title>
            <Dialog.Description className="text-xs text-slate-500 dark:text-slate-400">
              Create a new emergency session and generate a tablet pairing QR code for the bedside.
            </Dialog.Description>

            <form onSubmit={handleAdmitPatient} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label htmlFor="bed-label" className="text-xs font-bold text-slate-700 dark:text-slate-300">Bed label</label>
                <Input id="bed-label" required maxLength={80} placeholder="e.g. Bed 5 or ICU Bed 2"
                  value={bedLabel} onChange={(e) => setBedLabel(e.target.value)} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Patient Name
                </label>
                <Input
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Triage Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['P0', 'P1', 'P2'].map((lvl) => (
                    <Button
                      key={lvl}
                      type="button"
                      variant={priority === lvl ? 'default' : 'outline'}
                      onClick={() => setPriority(lvl)}
                      className={`h-9 text-xs font-bold rounded-xl ${
                        priority === lvl ? 'bg-teal text-white' : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {lvl === 'P0' ? '🚨 P0 Critical' : lvl === 'P1' ? '⚠️ P1 Urgent' : 'ℹ️ P2 Routine'}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsAdmitOpen(false)}
                  className="h-9 text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 text-xs font-bold bg-teal hover:bg-teal-light text-white px-4 rounded-xl"
                >
                  {isSubmitting ? 'Admitting...' : 'Admit & Generate QR'}
                </Button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {/* 2. Bedside Tablet Pairing QR Modal */}
      <Dialog.Root open={isQROpen} onOpenChange={setIsQROpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-in fade-in" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-2xl z-50 text-center space-y-4">
            <button
              type="button"
              onClick={() => setIsQROpen(false)}
              aria-label="Close dialog"
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <Dialog.Title className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              Pair Bedside Tablet
            </Dialog.Title>
            
            <Dialog.Description className="text-xs text-slate-500 dark:text-slate-400">
              Scan with hospital iPad/tablet to launch the patient kiosk for:
              <span className="block font-bold text-slate-800 dark:text-slate-200 mt-1">
                {selectedSession?.patient_display_name}
              </span>
            </Dialog.Description>

            {isQROpen && selectedSession && <KioskPairing key={selectedSession.id} sessionId={selectedSession.id} />}
            <Button variant="outline" onClick={() => setIsQROpen(false)}>Close</Button>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  )
}
