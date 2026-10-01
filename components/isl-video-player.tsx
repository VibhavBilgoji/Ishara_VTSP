'use client'

import React, { useRef, useState, useEffect } from 'react'
import { X, RotateCcw, Video, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EMERGENCY_P0_PICTOGRAMS, ALL_CATEGORY_PICTOGRAMS } from '@/lib/pictograms'
import { getClipUrl } from '@/lib/isl-clips'

interface ISLVideoPlayerProps {
  clipKey: string
  clipLabel: string
  videoUrl?: string
  hindiLabel?: string
  onClose: () => void
  autoCloseSeconds?: number
}

export function ISLVideoPlayer({
  clipKey,
  clipLabel,
  videoUrl,
  hindiLabel,
  onClose,
  autoCloseSeconds = 30,
}: ISLVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const directPublicUrl = getClipUrl(clipKey)
  const initialUrl = videoUrl && videoUrl.startsWith('http') ? videoUrl : directPublicUrl

  const [currentSrc, setCurrentSrc] = useState<string>(initialUrl)
  const [hasError, setHasError] = useState(false)

  // Reset states whenever clip changes & ensure video is strictly muted
  useEffect(() => {
    const nextUrl = videoUrl && videoUrl.startsWith('http') ? videoUrl : getClipUrl(clipKey)
    setCurrentSrc(nextUrl)
    setHasError(false)
    if (videoRef.current) {
      videoRef.current.muted = true
      videoRef.current.volume = 0
    }
  }, [videoUrl, clipKey])

  const resolvedHindi =
    hindiLabel ||
    EMERGENCY_P0_PICTOGRAMS.find((p) => p.key === clipKey)?.hindiText ||
    Object.values(ALL_CATEGORY_PICTOGRAMS)
      .flat()
      .find((p) => p.key === clipKey)?.hindiText

  useEffect(() => {
    // Optional auto-dismiss after clip duration
    const timer = setTimeout(() => {
      onClose()
    }, autoCloseSeconds * 1000)

    return () => clearTimeout(timer)
  }, [autoCloseSeconds, onClose])

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.muted = true
      videoRef.current.volume = 0
      videoRef.current.play().catch(() => {})
    }
  }

  const handleVideoError = () => {
    // If the failed URL wasn't the direct Supabase public URL, retry with direct public URL
    if (currentSrc !== directPublicUrl) {
      setCurrentSrc(directPublicUrl)
    } else {
      setHasError(true)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-3 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border-2 border-teal flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-3 sm:p-4 bg-teal text-white">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-teal-300 animate-pulse" />
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-teal-200">
                ISL Translation • भारतीय सांकेतिक भाषा
              </span>
              <h2 className="text-lg sm:text-xl font-bold leading-tight">
                {clipLabel}
              </h2>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full h-10 w-10"
            aria-label="Close video"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Video Area */}
        <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
          {currentSrc && !hasError ? (
            <video
              ref={videoRef}
              key={currentSrc}
              src={currentSrc}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
              onError={handleVideoError}
            />
          ) : (
            /* Visual Fallback Card if video asset isn't in Storage yet */
            <div className="flex flex-col items-center justify-center text-center p-6 text-white space-y-4">
              <div className="w-24 h-24 rounded-full bg-teal-900/60 border-4 border-teal-400 flex items-center justify-center animate-pulse">
                <span className="text-4xl">🤟</span>
              </div>
              <div className="max-w-md space-y-2">
                <p className="text-xs font-bold text-teal-400 tracking-widest uppercase">
                  Indian Sign Language Clip
                </p>
                <h3 className="text-2xl font-bold text-white">{clipLabel}</h3>
                {resolvedHindi && (
                  <p className="text-lg font-medium text-teal-200">{resolvedHindi}</p>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  Key: <code className="bg-slate-800 px-2 py-0.5 rounded text-teal-300">{clipKey}</code>
                </p>
              </div>
            </div>
          )}

          {/* Subtitle Banner at bottom of video */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 text-center">
            <div className="inline-block bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
              <span className="text-lg sm:text-2xl font-bold text-white tracking-wide">
                &ldquo;{clipLabel}&rdquo;
              </span>
              {resolvedHindi && (
                <span className="block text-sm sm:text-base font-semibold text-teal-300">
                  {resolvedHindi}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReplay}
              className="text-white border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Replay Sign
            </Button>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              <span>Muted</span>
            </span>
          </div>

          <Button
            size="sm"
            onClick={onClose}
            className="bg-teal-600 hover:bg-teal-500 text-white text-xs px-4"
          >
            Done / समझ गया
          </Button>
        </div>
      </div>
    </div>
  )
}
