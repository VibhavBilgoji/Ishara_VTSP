'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { LiveKitVideoCall } from '@/components/livekit-video-call'
import { useSessionRealtime } from '@/hooks/use-session-realtime'
import { createClient } from '@/lib/supabase/client'
import { isStaffRole } from '@/lib/roles'
import { ArrowLeft, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function InterpreterCallPage() {
  const params = useParams<{ sessionId: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = params.sessionId || '00000000-0000-0000-0000-000000000001'

  const [isSpectator, setIsSpectator] = useState(searchParams?.get('role') === 'spectator')
  const [participantName, setParticipantName] = useState('Certified ISL Interpreter')
  const [participantIdentity, setParticipantIdentity] = useState(`interpreter-${sessionId.slice(0, 6)}`)

  useEffect(() => {
    async function determineRole() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
          if (profile && isStaffRole(profile.role)) {
            setIsSpectator(true)
            setParticipantName(`${profile.full_name || 'Hospital Doctor'} (Spectator)`)
            setParticipantIdentity(`staff-${user.id.slice(0, 8)}`)
          }
        }
      } catch (err) {
        console.warn('Error fetching role in call page:', err)
      }
    }
    void determineRole()
  }, [])

  const { sendStatusChange } = useSessionRealtime({
    sessionId,
    onStatusReceived: (status) => {
      if (status.newStatus !== 'interpreter_connected') {
        toast.info('Video session concluded')
        if (isSpectator) {
          router.push(`/dashboard/${sessionId}`)
        } else {
          router.push('/interpreter/dashboard')
        }
      }
    },
  })

  const handleExitCall = () => {
    if (isSpectator) {
      toast.info('Exited spectator stream')
      router.push(`/dashboard/${sessionId}`)
    } else {
      void handleEndCall()
    }
  }

  const handleEndCall = async () => {
    toast.success('Call ended. Returning to interpreter dashboard.')
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

    router.push('/interpreter/dashboard')
  }

  return (
    <main className="h-screen w-screen bg-slate-950 text-white flex flex-col overflow-hidden p-2 sm:p-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExitCall}
            className="text-slate-400 hover:text-white hover:bg-slate-900 text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            {isSpectator ? 'Exit Spectator View' : 'Exit Call'}
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
            <h1 className="text-sm font-bold text-teal-300">
              {isSpectator ? 'Ishara Clinical Spectator Stream' : 'Ishara Live Relay Room'}
            </h1>
            {isSpectator && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Doctor Spectator (View Only)
              </span>
            )}
          </div>
        </div>

        <div className="text-xs font-mono text-slate-400">
          Session: <span className="text-white font-bold">{sessionId.slice(0, 8)}...</span>
        </div>
      </div>

      {/* Real LiveKit WebRTC Video Room */}
      <div className="flex-1 w-full h-full overflow-hidden">
        <LiveKitVideoCall
          roomName={sessionId}
          participantName={participantName}
          participantIdentity={participantIdentity}
          role={isSpectator ? 'staff' : 'interpreter'}
          onDisconnect={handleExitCall}
        />
      </div>
    </main>
  )
}
