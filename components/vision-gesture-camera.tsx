'use client'

/**
 * components/vision-gesture-camera.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Patient-side sign language camera component.
 *
 * Features:
 *  - Live <video> + <canvas> overlay drawing MediaPipe hand skeleton
 *  - Privacy shutter toggle (camera on / off)
 *  - Confidence progress ring (fills as gesture is held)
 *  - High-precision gesture dispatch via sendGestureText
 *  - Word buffer chips showing accumulated session words
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'
import {
  initRecognizers,
  destroyRecognizers,
  classifyFrame,
  type DetectedGesture,
} from '@/lib/sign-recognition'

// ─── MediaPipe hand connections for skeleton drawing ─────────────────────────
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],           // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],           // index
  [0, 9], [9, 10], [10, 11], [11, 12],      // middle
  [0, 13], [13, 14], [14, 15], [15, 16],    // ring
  [0, 17], [17, 18], [18, 19], [19, 20],    // pinky
  [5, 9], [9, 13], [13, 17],                // palm
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface VisionGestureCameraProps {
  /** Called after hold confirmation with confirmed gesture text + confidence */
  sendGestureText: (text: string, confidence: number) => void
  /** Optional callback when camera active state changes */
  onCameraStateChange?: (active: boolean) => void
  className?: string
}

// ─── Types for Landmark Input ─────────────────────────────────────────────────
type LandmarkPt = { x: number; y: number }
type LandmarkInput =
  | LandmarkPt[]
  | { left: LandmarkPt[] | null; right: LandmarkPt[] | null }
  | null

// ─── Component ────────────────────────────────────────────────────────────────

export function VisionGestureCamera({
  sendGestureText,
  onCameraStateChange,
  className = '',
}: VisionGestureCameraProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const lastSentLabelRef = useRef<string>('')
  const lastSentTimeRef = useRef<number>(0)

  const [cameraOn, setCameraOn] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [pendingConf, setPendingConf] = useState(0)
  const [lastGesture, setLastGesture] = useState<DetectedGesture | null>(null)
  const [wordBuffer, setWordBuffer] = useState<string[]>([])
  const [flashLabel, setFlashLabel] = useState('')
  const [initError, setInitError] = useState('')
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false)
  // CSS overlay fallback for browsers without element fullscreen (e.g. iPhone Safari)
  const [isOverlayFullscreen, setIsOverlayFullscreen] = useState(false)
  const isFullscreen = isNativeFullscreen || isOverlayFullscreen

  // ─── Skeleton drawing ───────────────────────────────────────────────────────

  const drawSkeleton = useCallback(
    (landmarks: LandmarkInput) => {
      const canvas = canvasRef.current
      const video = videoRef.current
      if (!canvas || !video) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = video.videoWidth || canvas.offsetWidth
      canvas.height = video.videoHeight || canvas.offsetHeight
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (!landmarks) return

      const W = canvas.width
      const H = canvas.height

      const drawHand = (handLms: LandmarkPt[], dotColor = '#4ade80') => {
        if (!handLms || handLms.length === 0) return
        const isNonZero = handLms.some(pt => pt.x !== 0 || pt.y !== 0)
        if (!isNonZero) return

        // Connection lines
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'
        ctx.lineWidth = 1.5
        for (const [a, b] of HAND_CONNECTIONS) {
          if (handLms[a] && handLms[b]) {
            ctx.beginPath()
            ctx.moveTo(handLms[a].x * W, handLms[a].y * H)
            ctx.lineTo(handLms[b].x * W, handLms[b].y * H)
            ctx.stroke()
          }
        }

        // Landmark dots
        for (const lm of handLms) {
          ctx.beginPath()
          ctx.arc(lm.x * W, lm.y * H, 3, 0, Math.PI * 2)
          ctx.fillStyle = dotColor
          ctx.fill()
        }
      }

      if (Array.isArray(landmarks)) {
        drawHand(landmarks, '#4ade80')
      } else {
        if (landmarks.left) drawHand(landmarks.left, '#22c55e')
        if (landmarks.right) drawHand(landmarks.right, '#2dd4bf')
      }
    },
    []
  )

  // ─── Recognition loop ───────────────────────────────────────────────────────

  const startLoop = useCallback(() => {
    const tick = (ts: number) => {
      const video = videoRef.current
      if (!video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const {
        gesture,
        candidate,
        landmarks,
        handsDetected: detectedHands,
        pendingConfidence,
        hasFace,
      } = classifyFrame(video, ts)

      drawSkeleton(landmarks)
      setPendingConf(pendingConfidence)
      if (hasFace !== undefined) {
        setFaceDetected(hasFace)
      }

      // Model functionality: Handle gesture confirmation and candidate preview
      if (gesture) {
        setLastGesture(gesture)
        setFlashLabel(gesture.displayText)
        setTimeout(() => setFlashLabel(''), 1500)

        // Add to word buffer (max 8)
        setWordBuffer(prev => {
          const next = [...prev, gesture.displayText].slice(-8)
          return next
        })

        // Broadcast to doctor via sendGestureText with duplicate throttle
        const now = Date.now()
        if (gesture.label !== lastSentLabelRef.current || now - lastSentTimeRef.current > 2500) {
          lastSentLabelRef.current = gesture.label
          lastSentTimeRef.current = now
          sendGestureText(gesture.displayText, gesture.confidence)
        }
      } else if (candidate) {
        // While gesture is being held, show live candidate in friend's HUD pill
        setLastGesture(candidate)
      } else if (detectedHands === 0) {
        setLastGesture(null)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [drawSkeleton, sendGestureText])

  // ─── Camera on/off ──────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOn(true)
      onCameraStateChange?.(true)
      startLoop()
    } catch (err) {
      setInitError('Camera permission denied or unavailable.')
      console.error('[ISL Camera]', err)
    }
  }, [onCameraStateChange, startLoop])

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    setCameraOn(false)
    setPendingConf(0)
    setLastGesture(null)
    setFaceDetected(false)
    onCameraStateChange?.(false)
  }, [onCameraStateChange])

  const toggleCamera = useCallback(() => {
    if (cameraOn) stopCamera()
    else startCamera()
  }, [cameraOn, startCamera, stopCamera])

  // ─── Full screen ────────────────────────────────────────────────────────────

  useEffect(() => {
    const onChange = () => {
      const native = document.fullscreenElement === containerRef.current
      setIsNativeFullscreen(native)
      if (native) setIsOverlayFullscreen(false)
    }
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  useEffect(() => {
    if (!isOverlayFullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOverlayFullscreen(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [isOverlayFullscreen])

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void }) | null
    if (!el) return

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {})
      return
    }
    if (isOverlayFullscreen) {
      setIsOverlayFullscreen(false)
      return
    }

    const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el)
    if (request) {
      try {
        // Some embedded webviews leave the request pending forever, so give up after a moment
        const outcome = await Promise.race([
          Promise.resolve(request()).then(() => 'entered' as const),
          new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 1000)),
        ])
        if (outcome === 'entered' || document.fullscreenElement === el) return
      } catch {
        // fall through to the overlay
      }
    }
    setIsOverlayFullscreen(true)
  }, [isOverlayFullscreen])

  // ─── Init model on mount ────────────────────────────────────────────────────

  useEffect(() => {
    initRecognizers()
      .then(() => setModelReady(true))
      .catch(err => setInitError(`Model load failed: ${err?.message ?? err}`))

    return () => {
      cancelAnimationFrame(rafRef.current)
      destroyRecognizers()
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  // ─── Confidence ring SVG ────────────────────────────────────────────────────

  const ringR = 14
  const ringC = 2 * Math.PI * ringR
  const ringOffset = ringC * (1 - pendingConf)

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {/* YouTube-style Subscreen Container */}
      <div
        ref={containerRef}
        role={isOverlayFullscreen ? 'dialog' : undefined}
        aria-modal={isOverlayFullscreen || undefined}
        aria-label={isFullscreen ? 'Sign camera, full screen' : undefined}
        className={`overflow-hidden bg-slate-950 ${
          isOverlayFullscreen
            ? 'fixed inset-0 z-[100] w-screen h-[100dvh]'
            : isNativeFullscreen
            ? 'relative w-screen h-screen'
            : 'relative rounded-2xl border-2 border-teal-500/40 w-full aspect-video max-h-[380px]'
        }`}
      >
        {/* Top Header Overlay Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 px-3 py-2 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${cameraOn ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'
                }`}
            />
            <span className="font-extrabold text-[12px] tracking-wide text-white flex items-center gap-1.5 whitespace-nowrap">
              <span>Vision Sign AI Live</span>
              <span className={`${isFullscreen ? '' : 'hidden xl:inline'} text-[10px] uppercase px-1.5 py-0.5 font-mono bg-teal-900/60 border border-teal-500/40 text-teal-300 rounded`}>
                24 ISL Signs
              </span>
            </span>
            {!modelReady && !initError && (
              <span className="text-[10px] text-amber-300 bg-amber-950/70 border border-amber-500/40 px-2 py-0.5 rounded-full animate-pulse">
                Loading Model…
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Full screen toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit full screen' : 'Full screen'}
              aria-label={isFullscreen ? 'Exit full screen' : 'Show camera full screen'}
              aria-pressed={isFullscreen}
              className={`rounded-lg bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center gap-1.5 transition-colors ${
                isFullscreen ? 'h-12 px-4' : 'h-10 w-10'
              }`}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">Exit full screen</span>
                </>
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            {/* Eye privacy toggle button */}
            <button
              type="button"
              onClick={toggleCamera}
              disabled={!modelReady && !cameraOn}
              title={cameraOn ? 'Turn Off Camera Shutter' : 'Turn On Sign Camera'}
              aria-label={cameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
              className={`${isFullscreen ? 'h-12 px-4' : 'h-10 px-3'} rounded-lg bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center gap-1.5 transition-colors disabled:opacity-50`}
            >
              {cameraOn ? (
                <>
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="text-[11px] font-bold whitespace-nowrap">Camera On</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                  <span className="text-[11px] font-bold whitespace-nowrap">Camera Off</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Video feed */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          muted
          playsInline
          aria-label="Patient sign language camera feed"
        />

        {/* MediaPipe 21-joint skeleton canvas overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full scale-x-[-1] pointer-events-none"
          aria-hidden
        />

        {/* Privacy Shutter: Dark frame when camera is OFF */}
        {!cameraOn && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center px-4 pt-12 pb-3 text-center space-y-3 z-10">
            <div className={`${isFullscreen ? '' : 'hidden'} p-3.5 rounded-full bg-slate-900 border-2 border-slate-800 text-slate-400 shadow-inner`}>
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.89L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                Camera Shutter Closed
              </h4>
              <p className="text-[11px] text-slate-400 max-w-sm mt-0.5 leading-relaxed">
                Hardware feed paused for patient privacy. Click &ldquo;Turn On Camera&rdquo; to start gesture triage.
              </p>
            </div>
            <button
              type="button"
              onClick={startCamera}
              disabled={!modelReady}
              className="bg-teal hover:bg-teal-light text-white font-bold text-xs h-9 px-5 rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Turn On Sign Detection Camera</span>
            </button>
          </div>
        )}

        {/* Top-left: face + hand tracking indicator when camera is active */}
        {cameraOn && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
            <span
              className={`text-xs px-2.5 py-1 rounded-full backdrop-blur-md transition-all flex items-center gap-1.5 border ${faceDetected
                ? 'bg-blue-950/70 border-blue-400/40 text-blue-300 shadow-sm shadow-blue-500/20'
                : 'bg-black/60 border-white/10 text-gray-400'
                }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${faceDetected ? 'bg-blue-400 animate-pulse' : 'bg-gray-500'
                  }`}
              />
              <span className="font-medium">
                {faceDetected ? 'ISL + Face' : 'ISL Hand'}
              </span>
            </span>
          </div>
        )}

        {/* Top-right: confidence ring + label */}
        {/* Live HUD Pill (active gesture + confidence ring) */}
        {cameraOn && (
          <div className="absolute top-12 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
            {lastGesture ? (
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-teal-400/80 text-white shadow-lg animate-in fade-in">
                <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                <div>
                  <span className="text-[9px] uppercase font-bold text-teal-300 block leading-tight tracking-wider">
                    Sign Detected
                  </span>
                  <span className={`font-bold text-white ${isFullscreen ? 'text-2xl' : 'text-xs'}`}>{lastGesture.displayText}</span>
                </div>
              </div>
            ) : (
              <div className="px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-xs border border-white/10 text-slate-300 text-[11px]">
                Waiting for sign gestures…
              </div>
            )}

            {/* Confidence ring SVG */}
            <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-xl border border-white/20">
              <svg width="32" height="32" aria-hidden>
                <circle cx="16" cy="16" r={ringR} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                <circle
                  cx="16"
                  cy="16"
                  r={ringR}
                  fill="none"
                  stroke={pendingConf >= 1 ? '#10b981' : '#f59e0b'}
                  strokeWidth="3"
                  strokeDasharray={ringC}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 16 16)"
                  style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.2s' }}
                />
              </svg>
              {lastGesture && (
                <span className="text-[11px] font-mono font-bold text-teal-300">
                  {Math.round(lastGesture.confidence * 100)}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Flash banner when gesture is confirmed */}
        {flashLabel && (
          <div className="absolute bottom-4 left-3 right-3 flex justify-center pointer-events-none z-20 animate-in slide-in-from-bottom-2">
            <div className={`bg-emerald-600/95 text-white font-bold rounded-xl shadow-xl flex items-center gap-2 border border-emerald-300/40 ${isFullscreen ? 'text-xl px-6 py-3' : 'text-xs px-4 py-2'}`}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>Broadcasted: &ldquo;{flashLabel}&rdquo; → Sent to Doctor</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {initError && (
          <div className="absolute inset-0 z-30 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center text-rose-300 text-xs space-y-2">
            <span className="font-bold text-sm">Camera Notice</span>
            <p>{initError}</p>
          </div>
        )}
      </div>

      {/* Word buffer chips below camera */}
      {wordBuffer.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 flex-wrap flex-1" role="list" aria-label="Detected words">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Session Signs:</span>
            {wordBuffer.map((word, i) => (
              <span
                key={i}
                role="listitem"
                className="bg-teal-500/15 text-teal-700 dark:text-teal-300 text-xs px-2.5 py-0.5 rounded-full border border-teal-500/30 font-semibold"
              >
                {word}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setWordBuffer([])}
            className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors ml-2 shrink-0 underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
