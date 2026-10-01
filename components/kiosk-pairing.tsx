'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Pairing { url: string; qrCode: string; expiresAt: string }

export function KioskPairing({ sessionId }: { sessionId: string }) {
  const [pairing, setPairing] = useState<Pairing | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const generate = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/session/${sessionId}/pairing`, { method: 'POST', signal })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not generate pairing code')
      if (!signal?.aborted) { setPairing(data); setError('') }
    } catch (error) {
      if (!signal?.aborted) setError(error instanceof Error ? error.message : 'Pairing unavailable')
    } finally { if (!signal?.aborted) setBusy(false) }
  }, [sessionId])
  useEffect(() => {
    const controller = new AbortController()
    void generate(controller.signal)
    return () => controller.abort()
  }, [generate])
  return <div className="space-y-4 text-center">
    {busy ? <p role="status">Generating pairing code…</p> : error ? <p role="alert" className="text-red-600 dark:text-red-300">{error}</p> : pairing && <>
      {/* Locally generated data URL: the secret never leaves this application. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={pairing.qrCode} width={200} height={200} alt="Scan to pair this bedside tablet" className="mx-auto rounded-xl bg-white" />
      <p className="text-xs text-slate-500 dark:text-slate-400">One use. Expires at {new Date(pairing.expiresAt).toLocaleTimeString()}. Tablet access lasts 12 hours or until discharge.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={async () => {
          try { await navigator.clipboard.writeText(pairing.url); toast.success('Pairing link copied') }
          catch { toast.error('Could not copy pairing link') }
        }}>Copy link</Button>
        <Button onClick={() => window.open(pairing.url, '_blank', 'noopener,noreferrer')}>Open tablet</Button>
      </div>
    </>}
    <Button variant="outline" disabled={busy} onClick={() => { setBusy(true); setPairing(null); void generate() }}>Generate new code</Button>
  </div>
}
