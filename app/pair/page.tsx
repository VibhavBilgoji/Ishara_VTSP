'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function PairPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function pair() {
    setBusy(true)
    setError('')
    try {
      const secret = window.location.hash.slice(1)
      const response = await fetch('/api/kiosk/pair', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Pairing failed')
      window.history.replaceState(null, '', '/pair')
      router.replace(`/patient/${data.sessionId}`)
    } catch (error) { setError(error instanceof Error ? error.message : 'Pairing failed') }
    finally { setBusy(false) }
  }
  return <main className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-white">
    <div className="w-full max-w-sm space-y-5 text-center">
      <h1 className="text-2xl font-bold">Pair bedside tablet</h1>
      <p className="text-slate-300">Connect this tablet to the bed selected by hospital staff.</p>
      <Button onClick={pair} disabled={busy} className="w-full min-h-12">{busy ? 'Pairing…' : 'Pair this tablet'}</Button>
      {error && <p role="alert" className="text-red-300">{error}</p>}
    </div>
  </main>
}
