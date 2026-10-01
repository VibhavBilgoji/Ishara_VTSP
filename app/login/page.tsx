'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { isStaffRole } from '@/lib/roles'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Stethoscope,
  Video,
  Tablet,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Loader2,
} from 'lucide-react'

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
    <main className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-4xl space-y-8 my-8">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 shadow-sm mb-2">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16">
              <Image
                src="/logo.png"
                alt="Ishara Logo"
                fill
                sizes="64px"
                className="object-contain"
                priority
              />
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#084C5B] dark:text-teal-300">
            Ishara • इशारा
          </h1>
          <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-xl mx-auto font-medium">
            Clinical Communication Platform for Deaf & Mute Indian Sign Language Patients
          </p>
        </div>

        {/* The Portals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Portal 1: Hospital Doctor Staff */}
          <Link href="/auth/hospital" className="block group">
            <Card className="h-full border-2 border-slate-200 dark:border-slate-800 group-hover:border-[#084C5B] transition-all duration-200 shadow-sm group-hover:shadow-xl rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="pb-3 bg-teal-50/50 dark:bg-teal-950/20 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-[#084C5B] text-white">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200">
                    Clinical Portal
                  </span>
                </div>
                <CardTitle className="text-xl font-bold mt-3 text-slate-900 dark:text-white">
                  Hospital Doctor & Staff
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Access patient bedside communication console, 2-way ISL signs, pictogram triage alerts, and remote interpreter calls.
                </p>
                <div className="flex items-center text-sm font-bold text-[#084C5B] dark:text-teal-400 group-hover:translate-x-1 transition-transform">
                  Enter Hospital Dashboard <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Portal 2: Remote ISL Interpreter */}
          <Link href="/auth/interpreter" className="block group">
            <Card className="h-full border-2 border-slate-200 dark:border-slate-800 group-hover:border-[#4F46E5] transition-all duration-200 shadow-sm group-hover:shadow-xl rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="pb-3 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-[#4F46E5] text-white">
                    <Video className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
                    Relay Pool
                  </span>
                </div>
                <CardTitle className="text-xl font-bold mt-3 text-slate-900 dark:text-white">
                  Certified ISL Interpreter
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Join incoming hospital paging queues, accept live emergency video calls, and provide real-time Indian Sign Language interpretation.
                </p>
                <div className="flex items-center text-sm font-bold text-[#4F46E5] dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                  Enter Interpreter Dashboard <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Portal 3: Bedside Tablet Kiosk Quick Entry */}
        <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-md rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-300 shrink-0">
                  <Tablet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Bedside Patient Tablet Kiosk
                  </h3>
                  <p className="text-xs text-slate-500">
                    Scan a pairing QR code from the hospital staff dashboard. Staff can sign in to select a bed and create a pairing link.
                  </p>
                </div>
              </div>

              {isStaff && <form onSubmit={(e) => handleOpenBedsideTablet(e)} className="w-full sm:w-auto flex items-center gap-2">
                <Input
                  placeholder="e.g. Bed 2, Bed 5, or Session ID"
                  value={bedInput}
                  onChange={(e) => setBedInput(e.target.value)}
                  className="h-10 text-xs w-full sm:w-56 rounded-xl"
                />
                <Button
                  type="submit"
                  disabled={isResolving}
                  className="bg-[#084C5B] hover:bg-[#0D748A] text-white font-bold text-xs h-10 px-4 rounded-xl shrink-0 flex items-center gap-1.5"
                >
                  {isResolving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Resolving...</span>
                    </>
                  ) : (
                    <>
                      <span>Open Bed Console</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </form>}
            </div>

            {/* Quick Live Bed Chips */}
            {activeBeds.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Hospital Beds:
                </span>
                {activeBeds.map((bed) => (
                  <button
                    key={bed.id}
                    type="button"
                    onClick={() => {
                      setBedInput(bed.bed_label)
                      handleOpenBedsideTablet(undefined, bed.id)
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-[#084C5B] dark:text-teal-200 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    <span>{bed.bed_label}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evaluation Credentials Banner */}
        {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-50 to-indigo-50 dark:from-teal-950/40 dark:to-indigo-950/40 border border-teal-200 dark:border-teal-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-700 dark:text-teal-300" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Evaluation & Judge Credentials (Pre-Seeded)
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-teal-200 dark:border-teal-800/60">
              <span className="font-bold text-[#084C5B] dark:text-teal-300 block mb-0.5">
                Hospital Doctor Account:
              </span>
              <p className="text-slate-600 dark:text-slate-300 font-mono">
                Email: <b>dr.sharma@apollo.health</b>
              </p>
              <p className="text-slate-600 dark:text-slate-300 font-mono">
                Password: <b>Ishara2026!</b>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-200 dark:border-indigo-800/60">
              <span className="font-bold text-[#4F46E5] dark:text-indigo-300 block mb-0.5">
                ISL Interpreter Account:
              </span>
              <p className="text-slate-600 dark:text-slate-300 font-mono">
                Email: <b>ananya.isl@relay.org</b>
              </p>
              <p className="text-slate-600 dark:text-slate-300 font-mono">
                Password: <b>Ishara2026!</b>
              </p>
            </div>
          </div>
        </div>

        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 font-medium">
          Ishara Clinical Communication Platform • Enterprise Production Architecture
        </p>
      </div>
    </main>
  )
}
