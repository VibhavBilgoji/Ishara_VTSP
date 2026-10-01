'use client'

import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  LayoutGrid,
  Sparkles,
  Video,
  Camera,
  Shield,
  ArrowRight,
  Menu,
  X,
  Heart,
  AlertTriangle,
  Brain,
  Stethoscope,
  Hand,
  FileText,
  Zap,
  Play,
  Code2,
  ExternalLink,
} from 'lucide-react'

/* ─────────────────── Animated Number Counter ─────────────────── */
function AnimatedCounter({
  target,
  suffix = '',
  prefix = '',
  duration = 2000,
}: {
  target: number
  suffix?: string
  prefix?: string
  duration?: number
}) {
  const [count, setCount] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          const startTime = performance.now()

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * target))
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration, hasAnimated])

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

/* ─────────────────── Scroll Reveal Wrapper ─────────────────── */
function ScrollReveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay)
          observer.unobserve(el)
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-white overflow-x-hidden">
      {/* ───────── NAVBAR ───────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/5 shadow-lg shadow-slate-900/5 dark:shadow-black/20'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <Image
                src="/logo.png"
                alt="Ishara"
                width={36}
                height={36}
                className="rounded-lg group-hover:scale-105 transition-transform"
              />
              <span className="font-heading text-lg font-bold tracking-tight">
                Ishara{' '}
                <span className="text-[#0D748A] text-sm font-medium">
                  • इशारा
                </span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {['Features', 'How It Works', 'Technology'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
                >
                  {item}
                </a>
              ))}
            </div>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#084C5B] hover:bg-[#0D748A] text-white text-sm font-semibold rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-teal-900/30"
              >
                Enter Platform
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 px-4 py-4 space-y-3">
            {['Features', 'How It Works', 'Technology'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white py-2"
              >
                {item}
              </a>
            ))}
            <Link
              href="/login"
              className="block w-full text-center px-5 py-2.5 bg-[#084C5B] hover:bg-[#0D748A] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Enter Platform →
            </Link>
          </div>
        )}
      </nav>

      {/* ───────── HERO SECTION ───────── */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-slate-50 to-[#084C5B]/10 dark:from-[#0B1120] dark:via-[#0B1120] dark:to-[#084C5B]/40 animate-[gradientShift_8s_ease-in-out_infinite]" />
          <div className="absolute top-1/4 -right-32 w-[500px] h-[500px] bg-[#084C5B]/8 dark:bg-[#084C5B]/20 rounded-full blur-[128px] animate-[pulse_6s_ease-in-out_infinite]" />
          <div className="absolute bottom-0 -left-32 w-[400px] h-[400px] bg-[#0D748A]/5 dark:bg-[#0D748A]/10 rounded-full blur-[100px] animate-[pulse_8s_ease-in-out_infinite_2s]" />
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
          {/* Dark-mode grid (white lines) layered on top */}
          <div
            className="absolute inset-0 opacity-0 dark:opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <ScrollReveal>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#084C5B]/10 dark:bg-[#084C5B]/20 border border-[#084C5B]/20 dark:border-[#084C5B]/30 text-[#084C5B] dark:text-[#5BBFD4] text-xs font-semibold mb-8 backdrop-blur-sm">
                <Zap className="w-3.5 h-3.5" />
                SANKALP SETU – College Level Hackathon 2026
              </div>
            </ScrollReveal>

            {/* Headline */}
            <ScrollReveal delay={100}>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
                Bridging Silence in{' '}
                <span className="bg-gradient-to-r from-[#084C5B] via-[#0D748A] to-[#084C5B] dark:from-[#0D748A] dark:via-[#5BBFD4] dark:to-[#0D748A] bg-clip-text text-transparent">
                  Clinical Care
                </span>
              </h1>
            </ScrollReveal>

            {/* Hindi subtitle */}
            <ScrollReveal delay={200}>
              <p className="text-lg sm:text-xl text-[#084C5B]/50 dark:text-[#5BBFD4]/60 font-medium mb-4 font-heading">
                चिकित्सा देखभाल में मौन को पाटना
              </p>
            </ScrollReveal>

            {/* Description */}
            <ScrollReveal delay={300}>
              <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                A zero-latency hospital communication bridge connecting deaf
                patients, clinical staff, and certified Indian Sign Language
                interpreters — powered by AI, WebRTC, and in-browser computer
                vision.
              </p>
            </ScrollReveal>

            {/* CTAs */}
            <ScrollReveal delay={400}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-[#084C5B] hover:bg-[#0D748A] text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-teal-900/30 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Enter Platform
                  <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <a
                  href="#how-it-works"
                  className="group inline-flex items-center gap-2.5 px-8 py-3.5 border border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/25 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold rounded-xl transition-all duration-300 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  <Play className="w-4 h-4" />
                  See How It Works
                </a>
              </div>
            </ScrollReveal>

            {/* Impact Stats */}
            <ScrollReveal delay={500}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                {[
                  {
                    value: 6300000,
                    suffix: '+',
                    label: 'Deaf Citizens in India',
                    icon: Heart,
                  },
                  {
                    value: 0,
                    suffix: '',
                    label: 'Hospitals with ISL Interpreters',
                    icon: AlertTriangle,
                  },
                  {
                    value: 400,
                    prefix: '< ',
                    suffix: 'ms',
                    label: 'AI Response Time',
                    icon: Zap,
                  },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="relative group px-5 py-4 rounded-xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] hover:border-[#084C5B]/30 dark:hover:border-[#084C5B]/40 transition-all duration-300 hover:bg-white dark:hover:bg-white/[0.05] shadow-sm dark:shadow-none"
                  >
                    <stat.icon className="w-4 h-4 text-[#0D748A]/50 dark:text-[#5BBFD4]/50 mb-2 mx-auto" />
                    <div className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 dark:text-white">
                      {stat.value === 0 ? (
                        <span className="text-[#DC2626]">0</span>
                      ) : (
                        <AnimatedCounter
                          target={stat.value}
                          suffix={stat.suffix}
                          prefix={stat.prefix || ''}
                        />
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ───────── PROBLEM STATEMENT ───────── */}
      <section className="py-20 lg:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center mb-14">
              <p className="text-[#0D748A] dark:text-[#5BBFD4] text-sm font-semibold uppercase tracking-widest mb-4">
                The Problem
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
                When a deaf patient arrives in an{' '}
                <span className="text-[#DC2626]">emergency</span>...
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
                Crucial clinical information — allergies, surgical history, pain
                locations, and informed consent — is lost or fatally
                misunderstood.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                icon: Stethoscope,
                title: 'Zero On-Call Interpreters',
                desc: 'Virtually no Indian hospital maintains ISL interpreters in their emergency wards.',
                accent: '#DC2626',
              },
              {
                icon: FileText,
                title: 'Handwritten Guesswork',
                desc: 'Doctors resort to crude handwritten notes, miming, and frantic guessing during emergencies.',
                accent: '#D97706',
              },
              {
                icon: Heart,
                title: 'Psychological Panic',
                desc: 'Deaf patients experience acute psychological distress, feeling completely alienated in critical settings.',
                accent: '#DC2626',
              },
            ].map((item, i) => (
              <ScrollReveal key={i} delay={i * 150}>
                <div className="relative p-6 rounded-2xl bg-white/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/10 transition-all duration-300 group shadow-sm dark:shadow-none">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${item.accent}15` }}
                  >
                    <item.icon
                      className="w-5 h-5"
                      style={{ color: item.accent }}
                    />
                  </div>
                  <h3 className="font-heading text-lg font-semibold mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FEATURES BENTO GRID ───────── */}
      <section id="features" className="py-20 lg:py-28 relative">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#084C5B]/4 dark:bg-[#084C5B]/8 rounded-full blur-[160px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-14">
              <p className="text-[#0D748A] dark:text-[#5BBFD4] text-sm font-semibold uppercase tracking-widest mb-4">
                The 5 Pillars
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                Purpose-Built for{' '}
                <span className="bg-gradient-to-r from-[#084C5B] to-[#0D748A] dark:from-[#0D748A] dark:to-[#5BBFD4] bg-clip-text text-transparent">
                  Clinical Reality
                </span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {/* Pillar 1 — Pictogram Grid (large) */}
            <ScrollReveal delay={0} className="md:col-span-2">
              <div className="group relative h-full p-7 rounded-2xl bg-gradient-to-br from-white/90 to-white/60 dark:from-white/[0.04] dark:to-white/[0.01] border border-slate-200/80 dark:border-white/[0.06] hover:border-[#084C5B]/30 dark:hover:border-[#084C5B]/40 transition-all duration-500 overflow-hidden shadow-sm dark:shadow-none">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#084C5B]/5 dark:bg-[#084C5B]/10 rounded-full blur-[80px] group-hover:bg-[#084C5B]/10 dark:group-hover:bg-[#084C5B]/20 transition-all duration-700" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-[#084C5B]/10 dark:bg-[#084C5B]/15 flex items-center justify-center mb-5">
                    <LayoutGrid className="w-6 h-6 text-[#0D748A] dark:text-[#5BBFD4]" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#DC2626]/10 dark:bg-[#DC2626]/15 text-[#DC2626] dark:text-[#EF4444] rounded-full">
                      P0 — Critical
                    </span>
                  </div>
                  <h3 className="font-heading text-xl font-bold mb-2">
                    Tactile Emergency Pictogram Grid
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                    40+ WCAG AAA high-contrast medical pictograms organized by
                    Emergency, Pain, Allergies, and Basic Needs. Large touch
                    targets with bilingual Hindi-English labels. Wong-Baker pain
                    scale with expressive facial emojis. One tap triggers
                    hospital-wide audio-visual triage alerts.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* Pillar 2 — Gemini AI */}
            <ScrollReveal delay={100}>
              <div className="group relative h-full p-7 rounded-2xl bg-gradient-to-br from-white/90 to-white/60 dark:from-white/[0.04] dark:to-white/[0.01] border border-slate-200/80 dark:border-white/[0.06] hover:border-[#084C5B]/30 dark:hover:border-[#084C5B]/40 transition-all duration-500 overflow-hidden shadow-sm dark:shadow-none">
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#0D748A]/5 dark:bg-[#0D748A]/10 rounded-full blur-[60px] group-hover:bg-[#0D748A]/10 dark:group-hover:bg-[#0D748A]/20 transition-all duration-700" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-[#084C5B]/10 dark:bg-[#084C5B]/15 flex items-center justify-center mb-5">
                    <Sparkles className="w-6 h-6 text-[#0D748A] dark:text-[#5BBFD4]" />
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#084C5B]/10 dark:bg-[#084C5B]/20 text-[#084C5B] dark:text-[#5BBFD4] rounded-full">
                    P1
                  </span>
                  <h3 className="font-heading text-xl font-bold mb-2 mt-2">
                    AI Sign Language Matching
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Gemini AI classifies Hindi, English, and Hinglish clinical
                    speech into ISL video clips in under 400ms. Built-in negation
                    safety rejects contradictory commands.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* Pillar 3 — LiveKit */}
            <ScrollReveal delay={150}>
              <div className="group relative h-full p-7 rounded-2xl bg-gradient-to-br from-white/90 to-white/60 dark:from-white/[0.04] dark:to-white/[0.01] border border-slate-200/80 dark:border-white/[0.06] hover:border-[#4F46E5]/20 dark:hover:border-[#4F46E5]/30 transition-all duration-500 overflow-hidden shadow-sm dark:shadow-none">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#4F46E5]/5 dark:bg-[#4F46E5]/8 rounded-full blur-[60px] group-hover:bg-[#4F46E5]/10 dark:group-hover:bg-[#4F46E5]/15 transition-all duration-700" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-[#4F46E5]/10 dark:bg-[#4F46E5]/15 flex items-center justify-center mb-5">
                    <Video className="w-6 h-6 text-[#4F46E5] dark:text-[#818CF8]" />
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#4F46E5]/10 dark:bg-[#4F46E5]/15 text-[#4F46E5] dark:text-[#818CF8] rounded-full">
                    P2
                  </span>
                  <h3 className="font-heading text-xl font-bold mb-2 mt-2">
                    Live Interpreter Relay
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Full-duplex WebRTC video via LiveKit Cloud. 30-second
                    escalation SLA with live countdown. Dual-tone emergency
                    chime paging system.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* Pillar 4 — Vision AI */}
            <ScrollReveal delay={200}>
              <div className="group relative h-full p-7 rounded-2xl bg-gradient-to-br from-white/90 to-white/60 dark:from-white/[0.04] dark:to-white/[0.01] border border-slate-200/80 dark:border-white/[0.06] hover:border-[#084C5B]/30 dark:hover:border-[#084C5B]/40 transition-all duration-500 overflow-hidden shadow-sm dark:shadow-none">
                <div className="absolute bottom-0 right-0 w-48 h-48 bg-[#0D748A]/4 dark:bg-[#0D748A]/8 rounded-full blur-[80px] group-hover:bg-[#0D748A]/8 dark:group-hover:bg-[#0D748A]/15 transition-all duration-700" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-[#084C5B]/10 dark:bg-[#084C5B]/15 flex items-center justify-center mb-5">
                    <Camera className="w-6 h-6 text-[#0D748A] dark:text-[#5BBFD4]" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#16A34A]/10 dark:bg-[#16A34A]/15 text-[#16A34A] dark:text-[#4ADE80] rounded-full">
                      P3 — Standout Feature
                    </span>
                  </div>
                  <h3 className="font-heading text-xl font-bold mb-2">
                    In-Browser Vision AI
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                    100% client-side machine learning via WebAssembly. MediaPipe
                    tracks 21 3D hand coordinates + 12 facial blendshapes.
                    Custom Random Forest classifier recognizes 24 clinical ISL
                    signs with 99.9% accuracy. Zero patient video ever leaves
                    the device — fully HIPAA/DISHA compliant.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            {/* Pillar 5 — Audit Trail */}
            <ScrollReveal delay={250}>
              <div className="group relative h-full p-7 rounded-2xl bg-gradient-to-br from-white/90 to-white/60 dark:from-white/[0.04] dark:to-white/[0.01] border border-slate-200/80 dark:border-white/[0.06] hover:border-[#084C5B]/30 dark:hover:border-[#084C5B]/40 transition-all duration-500 overflow-hidden shadow-sm dark:shadow-none">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-[#084C5B]/10 dark:bg-[#084C5B]/15 flex items-center justify-center mb-5">
                    <Shield className="w-6 h-6 text-[#0D748A] dark:text-[#5BBFD4]" />
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#084C5B]/10 dark:bg-[#084C5B]/20 text-[#084C5B] dark:text-[#5BBFD4] rounded-full">
                    P4
                  </span>
                  <h3 className="font-heading text-xl font-bold mb-2 mt-2">
                    Medico-Legal Audit Trail
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Immutable timestamped event ledger for every interaction.
                    Dynamic bed resolution, QR pairing, and clinical compliance
                    documentation.
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ───────── HOW IT WORKS ───────── */}
      <section id="how-it-works" className="py-20 lg:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-[#0D748A] dark:text-[#5BBFD4] text-sm font-semibold uppercase tracking-widest mb-4">
                How It Works
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                Three Portals,{' '}
                <span className="bg-gradient-to-r from-[#084C5B] to-[#0D748A] dark:from-[#0D748A] dark:to-[#5BBFD4] bg-clip-text text-transparent">
                  One Bridge
                </span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-0 max-w-5xl mx-auto relative">
            {/* Connector line (desktop only) */}
            <div className="hidden lg:block absolute top-24 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-[#084C5B]/30 via-[#0D748A]/40 to-[#084C5B]/30 dark:from-[#084C5B]/50 dark:via-[#0D748A]/60 dark:to-[#084C5B]/50" />

            {[
              {
                step: '01',
                icon: Hand,
                title: 'Patient Communicates',
                desc: 'Deaf patient taps pictogram cards or signs in front of the bedside camera. No typing, no voice required.',
                color: '#0D748A',
              },
              {
                step: '02',
                icon: Brain,
                title: 'AI Translates',
                desc: 'Gemini AI matches clinical intent to ISL video clips. MediaPipe recognizes hand gestures in real-time, entirely in-browser.',
                color: '#5BBFD4',
              },
              {
                step: '03',
                icon: Stethoscope,
                title: 'Doctor Understands',
                desc: 'Clinical staff receives translated alerts with Hindi subtitles. Can respond with ISL clips or page a live interpreter.',
                color: '#0D748A',
              },
            ].map((item, i) => (
              <ScrollReveal key={i} delay={i * 200}>
                <div className="relative flex flex-col items-center text-center px-6">
                  {/* Step circle */}
                  <div
                    className="relative w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border border-slate-200/80 dark:border-white/[0.08]"
                    style={{ backgroundColor: `${item.color}12` }}
                  >
                    <item.icon
                      className="w-8 h-8"
                      style={{ color: item.color }}
                    />
                    {/* Step number badge */}
                    <span className="absolute -top-2 -right-2 w-7 h-7 bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-white/10 rounded-full flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg font-bold mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
                    {item.desc}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── TECHNOLOGY STACK ───────── */}
      <section id="technology" className="py-20 lg:py-24 relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-[#084C5B]/3 dark:via-[#084C5B]/5 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-12">
              <p className="text-[#0D748A] dark:text-[#5BBFD4] text-sm font-semibold uppercase tracking-widest mb-4">
                Technology
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">
                Built with Production-Grade Tools
              </h2>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={200}>
            <div className="flex flex-wrap items-center justify-center gap-3 max-w-4xl mx-auto">
              {[
                { name: 'Next.js 16', color: '#000000', colorDark: '#FFFFFF' },
                { name: 'React 19', color: '#61DAFB', colorDark: '#61DAFB' },
                { name: 'TypeScript 5', color: '#3178C6', colorDark: '#3178C6' },
                { name: 'Supabase', color: '#3FCF8E', colorDark: '#3FCF8E' },
                { name: 'LiveKit WebRTC', color: '#FF6B6B', colorDark: '#FF6B6B' },
                { name: 'Google Gemini AI', color: '#4285F4', colorDark: '#4285F4' },
                { name: 'MediaPipe WASM', color: '#0097A7', colorDark: '#0097A7' },
                { name: 'Tailwind CSS v4', color: '#38BDF8', colorDark: '#38BDF8' },
                { name: 'Bun Runtime', color: '#C4956A', colorDark: '#FBF0DF' },
                { name: 'Random Forest ML', color: '#16A34A', colorDark: '#16A34A' },
              ].map((tech, i) => (
                <div
                  key={i}
                  className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/15 transition-all duration-300 hover:bg-white dark:hover:bg-white/[0.06] shadow-sm dark:shadow-none"
                >
                  <span
                    className="w-2 h-2 rounded-full hidden dark:inline-block"
                    style={{ backgroundColor: tech.colorDark }}
                  />
                  <span
                    className="w-2 h-2 rounded-full inline-block dark:hidden"
                    style={{ backgroundColor: tech.color }}
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                    {tech.name}
                  </span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ───────── FINAL CTA ───────── */}
      <section className="py-20 lg:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="relative max-w-3xl mx-auto text-center p-10 sm:p-14 rounded-3xl bg-gradient-to-br from-[#084C5B]/8 to-[#0D748A]/3 dark:from-[#084C5B]/15 dark:to-[#0D748A]/5 border border-[#084C5B]/15 dark:border-[#084C5B]/20 overflow-hidden">
              {/* Glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#084C5B]/10 dark:bg-[#084C5B]/20 rounded-full blur-[80px]" />

              <div className="relative">
                <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                  Ready to bridge the{' '}
                  <span className="bg-gradient-to-r from-[#084C5B] to-[#0D748A] dark:from-[#0D748A] dark:to-[#5BBFD4] bg-clip-text text-transparent">
                    communication gap
                  </span>
                  ?
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg mb-8 max-w-lg mx-auto">
                  Explore the platform as a doctor, interpreter, or patient.
                  Pre-seeded demo accounts ready for instant evaluation.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/login"
                    className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-[#084C5B] hover:bg-[#0D748A] text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-teal-900/30 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Enter Platform
                    <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <a
                    href="https://github.com/SPB-6814/Ishara_VTSP"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <Code2 className="w-4 h-4" />
                    View on GitHub
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer className="border-t border-slate-200/80 dark:border-white/[0.04] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Ishara"
                width={24}
                height={24}
                className="rounded"
              />
              <span className="text-sm text-slate-500 dark:text-slate-500">
                Ishara • इशारा — Bridging Silence in Clinical Care with Dignity
                and Precision.
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-600">
              <span>Built for</span>
              <span className="text-[#0D748A] dark:text-[#5BBFD4] font-semibold">
                SANKALP SETU – College Level Hackathon 2026
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* ───────── CSS Keyframes (injected) ───────── */}
      <style jsx global>{`
        @keyframes gradientShift {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </div>
  )
}
