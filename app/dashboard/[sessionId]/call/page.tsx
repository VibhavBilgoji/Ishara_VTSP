'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { LiveKitVideoCall } from '@/components/livekit-video-call'
import { useSessionRealtime } from '@/hooks/use-session-realtime'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function DoctorCallStreamPage() {
  const params = useParams<{ sessionId: string }>()
  const router = useRouter()
  const sessionId = params.sessionId || '00000000-0000-0000-0000-000000000001'

  const [patientDisplayName, setPatientDisplayName] = useState('Bedside patient')
  const [doctorName, setDoctorName] = useState('Attending Physician')

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
          if (profile?.full_name) setDoctorName(profile.full_name)
        }

        const { data: session } = await supabase.from('sessions').select('patient_display_name').eq('id', sessionId).maybeSingle()
        if (session?.patient_display_name) setPatientDisplayName(session.patient_display_name)
      } catch (err) {
        console.warn('Error loading session data for spectator:', err)
      }
    }
    void loadData()
  }, [sessionId])

  useSessionRealtime({
    sessionId,
    onStatusReceived: (status) => {
      if (status.newStatus !== 'interpreter_connected') {
        toast.info('Patient-Interpreter call has concluded')
        router.push(`/dashboard/${sessionId}`)
      }
    },
  })

  const handleExitSpectator = () => {
    toast.info('Closed spectator stream')
    router.push(`/dashboard/${sessionId}`)
  }

  return (
    <main className="h-screen w-screen bg-slate-950 text-white flex flex-col overflow-hidden p-2 sm:p-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExitSpectator}
            className="text-slate-400 hover:text-white hover:bg-slate-900 text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Bed Console
          </Button>

          <div className="flex items-center gap-2">
            <div className="relative w-6 h-6 rounded-md overflow-hidden bg-teal-500/20 flex items-center justify-center">
              <Image
                src="/logo-mark-white.png"
                alt="Ishara Logo"
                fill
                sizes="24px"
                className="object-contain"
              />
            </div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Clinical Spectator Stream</span>
              <span className="text-teal-400 font-mono">({patientDisplayName})</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
              <Eye className="w-3 h-3" /> Doctor Spectator (View Only)
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-3">
          <span className="font-medium text-slate-300">{doctorName}</span>
          <span className="font-mono text-slate-500 hidden sm:inline">Session: {sessionId.slice(0, 8)}...</span>
        </div>
      </div>

      {/* Real LiveKit WebRTC Video Room in Spectator Mode */}
      <div className="flex-1 w-full h-full min-h-0 overflow-hidden">
        <LiveKitVideoCall
          roomName={sessionId}
          participantName={`${doctorName} (Spectator)`}
          participantIdentity={`staff-${sessionId.slice(0, 8)}`}
          role="staff"
          onDisconnect={handleExitSpectator}
        />
      </div>
    </main>
  )
}
