'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { isStaffRole } from '@/lib/roles'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Stethoscope, Video, BedDouble, ArrowRight, Loader2 } from 'lucide-react'

interface ActiveBedItem {
  id: string
  bed_label: string
  status: string
}

export default function LoginPage() {
  const router = useRouter()
  const [bedInput, setBedInput] = useState('')
  const [activeBeds, setActiveBeds] = useState<ActiveBedItem[]>([])
  const [isResolving, setIsResolving] = useState(false)
  const [isStaff, setIsStaff] = useState(false)

  useEffect(() => {
    async function loadBeds() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase.from('profiles').select('role, hospital_id').eq('id', user.id).single()
        if (!profile || !isStaffRole(profile.role) || !profile.hospital_id) return
        setIsStaff(true)
        const response = await fetch('/api/session?list=true&labels=true')
        if (response.ok) setActiveBeds((await response.json()).sessions)
      } catch { /* Anonymous portal selection remains available. */ }
    }
    void loadBeds()
  }, [])

  const handleOpenBedsideTablet = async (e?: React.FormEvent, directBedOrId?: string) => {
    e?.preventDefault()
    const target = (directBedOrId || bedInput).trim()
    if (!target) return
    setIsResolving(true)
    try {
      const byId = /^[0-9a-f-]{36}$/i.test(target)
      const response = await fetch(`/api/session?${byId ? 'id' : 'bed'}=${encodeURIComponent(target)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Bed not found')
      router.push(`/dashboard/${data.session.id}`)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Bed not found') }
    finally { setIsResolving(false) }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] bg-background text-foreground">
      {/* Brand panel */}
      <aside className="bg-teal text-white px-6 py-8 sm:px-12 sm:py-12 flex flex-col justify-between gap-10">
        <Link href="/" className="flex items-center gap-3 w-fit">
          <span className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center">
            <Image src="/logo.png" alt="" width={40} height={40} className="object-contain" priority />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-heading font-bold text-2xl">Ishara</span>
            <span lang="hi" className="text-sm text-teal-100">इशारा</span>
          </span>
        </Link>

        <div className="space-y-5 max-w-md">
          <h1 className="font-heading font-bold text-4xl sm:text-5xl leading-[1.02] tracking-tight">
            Who is joining the bridge today?
          </h1>
          <p className="text-lg leading-relaxed text-teal-100">
            Choose your role. Staff and interpreters sign in; a bedside tablet pairs with a bed code.
          </p>
        </div>

        {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
        <div className="rounded-2xl bg-white/10 p-5 space-y-3 text-sm">
          <span className="block text-xs font-bold tracking-[0.08em] text-teal-200">DEMO ACCOUNTS</span>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <span className="font-semibold block">Hospital doctor</span>
              <span className="font-mono text-teal-100 block break-all">dr.sharma@apollo.health</span>
              <span className="font-mono text-teal-100 block">Ishara2026!</span>
            </div>
            <div className="space-y-0.5">
              <span className="font-semibold block">ISL interpreter</span>
              <span className="font-mono text-teal-100 block break-all">ananya.isl@relay.org</span>
              <span className="font-mono text-teal-100 block">Ishara2026!</span>
            </div>
          </div>
        </div>
        )}
      </aside>

      {/* Role choices */}
      <div className="px-4 py-8 sm:px-12 sm:py-12 flex flex-col justify-center gap-4 w-full max-w-2xl mx-auto">
        <Link
          href="/auth/hospital"
          className="group flex items-center gap-5 p-6 rounded-[20px] bg-card border border-border hover:border-teal hover:-translate-y-0.5 transition-all"
        >
          <span className="w-14 h-14 shrink-0 rounded-2xl bg-teal text-white flex items-center justify-center">
            <Stethoscope className="w-6 h-6" />
          </span>
          <span className="flex-1 space-y-1">
            <span className="block font-heading font-bold text-xl">Hospital staff</span>
            <span className="block text-[15px] leading-normal text-muted-foreground">
              Doctors and nurses: bed roster, alerts and ISL replies.
            </span>
          </span>
          <ArrowRight className="w-5 h-5 text-teal-ink group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          href="/auth/interpreter"
          className="group flex items-center gap-5 p-6 rounded-[20px] bg-card border border-border hover:border-indigo hover:-translate-y-0.5 transition-all"
        >
          <span className="w-14 h-14 shrink-0 rounded-2xl bg-indigo text-white flex items-center justify-center">
            <Video className="w-6 h-6" />
          </span>
          <span className="flex-1 space-y-1">
            <span className="block font-heading font-bold text-xl">ISL interpreter</span>
            <span className="block text-[15px] leading-normal text-muted-foreground">
              Certified interpreters: take live video calls from wards.
            </span>
          </span>
          <ArrowRight className="w-5 h-5 text-indigo-ink group-hover:translate-x-1 transition-transform" />
        </Link>

        <div className="flex flex-col gap-4 p-6 rounded-[20px] bg-card border border-border">
          <div className="flex items-center gap-5">
            <span className="w-14 h-14 shrink-0 rounded-2xl bg-teal-surface text-teal-ink flex items-center justify-center">
              <BedDouble className="w-6 h-6" />
            </span>
            <span className="space-y-1">
              <span className="block font-heading font-bold text-xl">Bedside tablet</span>
              <span className="block text-[15px] leading-normal text-muted-foreground">
                Scan a pairing QR code from the staff console. Signed-in staff can open a bed below.
              </span>
            </span>
          </div>
          {isStaff && (
          <form onSubmit={(e) => handleOpenBedsideTablet(e)} className="flex flex-wrap gap-2.5">
            <label htmlFor="bed-code" className="sr-only">Bed name or session ID</label>
            <input
              id="bed-code"
              placeholder="Bed 2, Bed 5 or session ID"
              value={bedInput}
              onChange={(e) => setBedInput(e.target.value)}
              className="flex-[1_1_220px] h-[52px] px-4 rounded-xl border-[1.5px] border-input bg-card text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-ring"
            />
            <button
              type="submit"
              disabled={isResolving}
              className="h-[52px] px-6 rounded-xl bg-teal hover:bg-teal-light text-white font-semibold flex items-center gap-2 disabled:opacity-70 transition-colors"
            >
              {isResolving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Finding bed…
                </>
              ) : (
                'Open bed console'
              )}
            </button>
          </form>
          )}

          {activeBeds.length > 0 && (
            <div className="pt-4 border-t border-border flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold tracking-[0.06em] text-muted-foreground mr-1">ACTIVE BEDS</span>
              {activeBeds.map((bed) => (
                <button
                  key={bed.id}
                  type="button"
                  onClick={() => {
                    setBedInput(bed.bed_label)
                    handleOpenBedsideTablet(undefined, bed.id)
                  }}
                  className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full border border-input bg-card text-sm font-semibold text-secondary-foreground hover:border-teal hover:text-teal-ink transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-success" />
                  {bed.bed_label}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground">Trouble signing in? Ask your ward administrator.</p>
      </div>
    </main>
  )
}
