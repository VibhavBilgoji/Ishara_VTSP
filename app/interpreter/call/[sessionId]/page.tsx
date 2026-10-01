'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { LiveKitVideoCall } from '@/components/livekit-video-call'
import { useSessionRealtime } from '@/hooks/use-session-realtime'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function InterpreterCallPage() {
  const params = useParams<{ sessionId: string }>()
  const router = useRouter()
  const sessionId = params.sessionId || '00000000-0000-0000-0000-000000000001'

  const { sendStatusChange } = useSessionRealtime({
    sessionId,
    onStatusReceived: (status) => {
      if (status.newStatus !== 'interpreter_connected') {
        toast.info('Video session concluded by patient')
        router.push('/interpreter/dashboard')
      }
    },
  })

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
            onClick={handleEndCall}
            className="text-slate-400 hover:text-white hover:bg-slate-900 text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit Call
          </Button>

          <div className="flex items-center gap-2">
            <div className="relative w-6 h-6 rounded-md overflow-hidden bg-teal-500/20 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Ishara Logo"
                fill
                sizes="24px"
                className="object-contain"
              />
            </div>
            <h1 className="text-sm font-bold text-teal-300">
              Ishara Live Relay Room
            </h1>
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
          participantName="Certified ISL Interpreter"
          participantIdentity={`interpreter-${sessionId.slice(0, 6)}`}
          role="interpreter"
          onDisconnect={handleEndCall}
        />
      </div>
    </main>
  )
}
