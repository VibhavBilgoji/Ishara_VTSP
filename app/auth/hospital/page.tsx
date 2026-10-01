'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Stethoscope, ArrowLeft, Mail, Lock, KeyRound, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { isStaffRole } from '@/lib/roles'

export default function HospitalAuthPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        throw error
      }

      if (data?.user) {
        const { data: profile, error: profileError } = await supabase.from('profiles')
          .select('role, hospital_id').eq('id', data.user.id).single()
        if (profileError || !profile || !isStaffRole(profile.role) || !profile.hospital_id) {
          await supabase.auth.signOut()
          throw new Error('This account is not authorized for the hospital portal.')
        }
        toast.success('Authenticated as ' + (data.user.user_metadata?.full_name || email))
        router.push('/dashboard')
      }
    } catch (err: any) {
      toast.error(err.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  const fillEvaluationAccount = (fillEmail: string, fillPass: string) => {
    setEmail(fillEmail)
    setPassword(fillPass)
    toast.info(`Filled credentials for ${fillEmail}`)
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Portal Selector
        </Link>

        <Card className="border-2 border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="bg-teal-50/50 dark:bg-teal-950/20 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-[#084C5B] text-white flex items-center justify-center mb-2 shadow">
              <Stethoscope className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl font-black text-slate-900 dark:text-white">
              Hospital Staff Portal
            </CardTitle>
            <p className="text-xs text-slate-500">
              Sign in with your hospital email and password to access the bedside triage roster.
            </p>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Hospital Doctor Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <Input
                    type="email"
                    required
                    placeholder="dr.sharma@apollo.health"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <Input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 h-11 rounded-xl"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#084C5B] hover:bg-[#0D748A] text-white font-bold"
              >
                {loading ? 'Authenticating...' : 'Sign In to Hospital Station'}
              </Button>
            </form>

            {/* Evaluation Credentials Helper for Judges */}
            {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Registered Clinical Accounts (Click to Fill)
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fillEvaluationAccount('dr.sharma@apollo.health', 'Ishara2026!')}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-500 text-left transition-all bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold block text-slate-900 dark:text-white">
                      Dr. Rajesh Sharma (Emergency)
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      dr.sharma@apollo.health • Ishara2026!
                    </span>
                  </div>
                  <KeyRound className="w-4 h-4 text-teal-600" />
                </button>

                <button
                  type="button"
                  onClick={() => fillEvaluationAccount('dr.verma@apollo.health', 'Ishara2026!')}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-500 text-left transition-all bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold block text-slate-900 dark:text-white">
                      Dr. Anjali Verma (Critical Care)
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      dr.verma@apollo.health • Ishara2026!
                    </span>
                  </div>
                  <KeyRound className="w-4 h-4 text-teal-600" />
                </button>
              </div>
            </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
