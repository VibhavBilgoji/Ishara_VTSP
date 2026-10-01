'use client'

import React, { useState, useEffect, useRef } from 'react'
import '@livekit/components-styles'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
  useRoomContext,
  useConnectionState,
  isTrackReference,
} from '@livekit/components-react'
import { Track, ConnectionState } from 'livekit-client'
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Users,
  Wifi,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface LiveKitVideoCallProps {
  roomName: string
  participantName: string
  participantIdentity?: string
  role?: 'patient' | 'interpreter' | 'staff'
  onDisconnect?: () => void
}

/**
 * Inner component that renders the 2-party video stage and media controls
 * inside an active LiveKitRoom context.
 */
function TwoPartyVideoStage({
  participantName,
  role = 'interpreter',
  onDisconnect,
}: {
  participantName: string
  role?: 'patient' | 'interpreter' | 'staff'
  onDisconnect?: () => void
}) {
  const room = useRoomContext()
  const connectionState = useConnectionState()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isSpectator = role === 'staff'
  const [micEnabled, setMicEnabled] = useState(!isSpectator)
  const [cameraEnabled, setCameraEnabled] = useState(!isSpectator)

  // Track all camera video streams in the room
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
  ])

  // Separate local participant track vs remote participant tracks
  const localTrack = tracks.find((t) => t.participant.isLocal)
  const remoteTracks = tracks.filter((t) => !t.participant.isLocal)
  const remoteTrack = tracks.find((t) => !t.participant.isLocal)

  // In spectator mode (Doctor), separate the two remote streams (Patient vs Interpreter)
  const patientTrack =
    remoteTracks.find(
      (t) =>
        t.participant.identity?.toLowerCase().startsWith('patient') ||
        t.participant.name?.toLowerCase().includes('patient')
    ) || remoteTracks[0]

  const interpreterTrack =
    remoteTracks.find(
      (t) =>
        (t.participant.identity?.toLowerCase().startsWith('interpreter') ||
          t.participant.name?.toLowerCase().includes('interpreter')) &&
        t !== patientTrack
    ) || (remoteTracks.length > 1 && remoteTracks[1] !== patientTrack ? remoteTracks[1] : null)

  const toggleMic = async () => {
    if (room?.localParticipant) {
      const next = !micEnabled
      await room.localParticipant.setMicrophoneEnabled(next)
      setMicEnabled(next)
      toast.info(next ? 'Microphone unmuted' : 'Microphone muted')
    }
  }

  const toggleCamera = async () => {
    if (room?.localParticipant) {
      const next = !cameraEnabled
      await room.localParticipant.setCameraEnabled(next)
      setCameraEnabled(next)
      toast.info(next ? 'Camera enabled' : 'Camera disabled')
    }
  }

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const el = containerRef.current || document.documentElement
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {})
      } else if ((el as any).webkitRequestFullscreen) {
        ;(el as any).webkitRequestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      } else if ((document as any).webkitExitFullscreen) {
        ;(document as any).webkitExitFullscreen()
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-0 bg-slate-950 text-white flex flex-col overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'rounded-none border-0' : 'rounded-2xl border-2 border-indigo-900'
      }`}
    >
      {/* Top Floating Status Pill */}
      <div className="absolute top-3 inset-x-3 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 pointer-events-auto">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-bold text-teal-300">
            {connectionState === ConnectionState.Connected
              ? isSpectator
                ? 'Clinical Spectator Stream'
                : 'WebRTC Live Relay'
              : 'Connecting WebRTC...'}
          </span>
          <span className="text-[11px] text-slate-300 font-mono hidden sm:inline">
            Room: {room?.name?.slice(0, 8)}...
          </span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600/90 text-white flex items-center gap-1.5 shadow">
            <Sparkles className="w-3.5 h-3.5" />
            {isSpectator ? 'Spectating Patient ⇄ Interpreter' : 'ISL HD Video Active'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="h-8 w-8 text-white hover:bg-white/20 rounded-lg bg-black/60 backdrop-blur-md"
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Video Stage */}
      <div className="flex-1 relative w-full h-full min-h-0 grid grid-cols-1 md:grid-cols-2 gap-2 p-2 pt-14 pb-16">
        {isSpectator ? (
          <>
            {/* Tile 1: Bedside Patient */}
            <div className="relative w-full h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              {patientTrack && isTrackReference(patientTrack) && patientTrack.publication?.isSubscribed ? (
                <VideoTrack
                  trackRef={patientTrack}
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-teal-950/80 border-2 border-teal-500 flex items-center justify-center animate-pulse">
                    <Users className="w-8 h-8 text-teal-300" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-white">
                      Waiting for Patient Video...
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Patient bedside tablet is connecting to the relay stream.
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Bedside Patient ({patientTrack?.participant.name || 'Patient'})
              </div>
            </div>

            {/* Tile 2: Certified ISL Interpreter */}
            <div className="relative w-full h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              {interpreterTrack && isTrackReference(interpreterTrack) && interpreterTrack.publication?.isSubscribed ? (
                <VideoTrack
                  trackRef={interpreterTrack}
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-950/80 border-2 border-indigo-500 flex items-center justify-center animate-pulse">
                    <Users className="w-8 h-8 text-indigo-300" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-white">
                      Waiting for Interpreter Video...
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Certified ISL interpreter is joining the live video relay.
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                Certified ISL Interpreter ({interpreterTrack?.participant.name || 'Interpreter'})
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Tile 1: Remote Participant (The other party) */}
            <div className="relative w-full h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              {remoteTrack && isTrackReference(remoteTrack) && remoteTrack.publication?.isSubscribed ? (
                <VideoTrack
                  trackRef={remoteTrack}
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-950/80 border-2 border-indigo-500 flex items-center justify-center animate-pulse">
                    <Users className="w-8 h-8 text-indigo-300" />
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-white">
                      {role === 'interpreter'
                        ? 'Waiting for Patient Camera...'
                        : 'Connecting with ISL Interpreter...'}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      {role === 'interpreter'
                        ? 'Patient tablet is connecting to this secure room.'
                        : 'Certified interpreter is joining the live video relay.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Remote Label */}
              <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {role === 'interpreter' ? 'Patient Bedside' : 'Certified ISL Interpreter'}
              </div>
            </div>

            {/* Tile 2: Local Participant (Self Camera Preview) */}
            <div className="relative w-full h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              {localTrack && isTrackReference(localTrack) && cameraEnabled ? (
                <VideoTrack
                  trackRef={localTrack}
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                  <VideoOff className="w-10 h-10 text-slate-500" />
                  <p className="text-xs text-slate-400">Your camera is turned off</p>
                </div>
              )}

              {/* Local Label */}
              <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                You ({participantName})
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Floating Controls Bar */}
      <div className="absolute bottom-2 inset-x-2 z-30 flex items-center justify-center gap-3 p-2 bg-black/80 backdrop-blur-md rounded-xl border border-white/10">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleMic}
          className={`h-11 w-11 rounded-xl border-slate-700 ${
            micEnabled ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-600 text-white hover:bg-red-700'
          }`}
          aria-label={micEnabled ? 'Mute mic' : 'Unmute mic'}
        >
          {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={toggleCamera}
          className={`h-11 w-11 rounded-xl border-slate-700 ${
            cameraEnabled ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-600 text-white hover:bg-red-700'
          }`}
          aria-label={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {cameraEnabled ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>

        {onDisconnect && (
          <Button
            onClick={onDisconnect}
            className="h-11 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-2 shadow-lg"
          >
            <PhoneOff className="w-4 h-4" />
            <span>{isSpectator ? 'Exit Spectator View' : 'End Call'}</span>
          </Button>
        )}
      </div>

      {/* Audio Renderer for remote participants */}
      <RoomAudioRenderer />
    </div>
  )
}

export function LiveKitVideoCall({
  roomName,
  participantName,
  participantIdentity,
  role = 'interpreter',
  onDisconnect,
}: LiveKitVideoCallProps) {
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchToken() {
      try {
        setLoading(true)
        setError(null)

        const identity = participantIdentity || `${role}-${Date.now()}`
        const res = await fetch('/api/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName,
            participantName,
            identity,
          }),
        })

        if (!res.ok) {
          throw new Error('Failed to mint LiveKit access token')
        }

        const data = await res.json()
        if (mounted) {
          setToken(data.token)
          setServerUrl(data.serverUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://demo.livekit.cloud')
        }
      } catch (err: any) {
        if (mounted) setError(err.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchToken()

    return () => {
      mounted = false
    }
  }, [roomName, participantName, participantIdentity, role])

  if (loading) {
    return (
      <div className="w-full h-full min-h-[320px] bg-slate-950 rounded-2xl flex flex-col items-center justify-center text-white p-6 space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        <p className="text-sm font-bold">Securing LiveKit WebRTC Session...</p>
        <span className="text-xs text-slate-400">Minting encrypted JWT token for room {roomName}</span>
      </div>
    )
  }

  if (error || !token || !serverUrl) {
    return (
      <div className="w-full h-full min-h-[320px] bg-slate-950 rounded-2xl flex flex-col items-center justify-center text-white p-6 text-center space-y-3 border border-red-800">
        <div className="p-3 bg-red-900/50 rounded-full text-red-300">
          <Wifi className="w-8 h-8" />
        </div>
        <h4 className="text-base font-bold text-red-200">Unable to Connect Video Call</h4>
        <p className="text-xs text-slate-400 max-w-sm">{error || 'Missing LiveKit server URL or token'}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="border-slate-700 text-white"
        >
          Retry Connection
        </Button>
      </div>
    )
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      video={role !== 'staff'}
      audio={role !== 'staff'}
      onError={(err) => {
        console.warn('LiveKit WebRTC connection notice:', err)
      }}
      onDisconnected={onDisconnect}
      data-lk-theme="default"
      className="w-full h-full flex flex-col min-h-0"
    >
      <TwoPartyVideoStage
        participantName={participantName}
        role={role}
        onDisconnect={onDisconnect}
      />
    </LiveKitRoom>
  )
}
