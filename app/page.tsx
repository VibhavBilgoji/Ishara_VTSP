'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  Code2,
  Droplet,
  Hand,
  HeartPulse,
  Languages,
  Menu,
  Mic,
  Moon,
  Play,
  ShieldCheck,
  Stethoscope,
  Sun,
  Video,
  Wind,
  X,
} from 'lucide-react'

const NAV_LINKS = [
  { href: '#pillars', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#technology', label: 'Technology' },
]

const STATS = [
  { value: '6.3M', label: 'Deaf & speech-impaired citizens in India' },
  { value: '≈ 0', label: 'Hospitals with on-call ISL interpreters' },
  { value: '<400ms', label: 'Clinical speech to ISL clip' },
]

const PROBLEMS = [
  {
    title: 'No interpreter on call',
    body: 'Virtually no Indian hospital keeps an ISL interpreter in its emergency ward.',
  },
  {
    title: 'Handwritten guesswork',
    body: 'Doctors fall back on scribbled notes, miming and guessing when every second counts.',
  },
  {
    title: 'Fear and isolation',
    body: 'Patients are frightened and shut out of decisions about their own care.',
  },
]

type Tone = 'emergency' | 'pain' | 'allergy' | 'care'

const TONE_CLASSES: Record<Tone, string> = {
  emergency: 'bg-emergency-surface border-red-400 dark:border-red-500/70 text-emergency-ink',
  pain: 'bg-warning-surface border-amber-400 dark:border-amber-500/70 text-warning-ink',
  allergy: 'bg-allergy-surface border-purple-400 dark:border-purple-500/70 text-allergy-ink',
  care: 'bg-teal-surface border-teal dark:border-teal-400/70 text-teal-ink',
}

const SAMPLE_PICTOGRAMS: { label: string; hindi: string; icon: React.ElementType; tone: Tone }[] = [
  { label: 'Chest Pain', hindi: 'सीने में दर्द', icon: HeartPulse, tone: 'emergency' },
  { label: 'Can’t Breathe', hindi: 'साँस लेने में तकलीफ़', icon: Wind, tone: 'emergency' },
  { label: 'Call Doctor', hindi: 'डॉक्टर को बुलाएं', icon: Stethoscope, tone: 'emergency' },
  { label: 'Pain Scale', hindi: 'दर्द का स्तर', icon: Activity, tone: 'pain' },
  { label: 'Severe Allergy', hindi: 'एलर्जी है', icon: AlertTriangle, tone: 'allergy' },
  { label: 'Need Water', hindi: 'पानी चाहिए', icon: Droplet, tone: 'care' },
]

const STEPS = [
  {
    icon: Hand,
    title: 'Patient communicates',
    body: 'Taps a pictogram or signs to the bedside camera. No typing, no voice needed.',
  },
  {
    icon: Languages,
    title: 'AI translates',
    body: 'Gemini maps clinical intent to ISL clips; MediaPipe reads hand signs in the browser.',
  },
  {
    icon: Stethoscope,
    title: 'Doctor understands',
    body: 'Staff see translated alerts with Hindi subtitles, reply with ISL clips, or page a live interpreter.',
  },
]

const TECH = [
  'Next.js 16',
  'React 19',
  'TypeScript 5',
  'Supabase',
  'LiveKit WebRTC',
  'Google Gemini',
  'MediaPipe WASM',
  'Tailwind CSS v4',
  'Bun',
  'Random Forest ML',
]

const LANDMARKS = [
  [44, 70],
  [36, 52],
  [31, 34],
  [28, 18],
  [44, 38],
  [45, 14],
  [53, 40],
  [57, 18],
  [60, 48],
]

function Eyebrow({ children, className = 'text-teal-ink' }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-[13px] font-bold tracking-[0.08em] ${className}`}>{children}</span>
}

function Tag({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`self-start px-2.5 py-1 rounded-md text-xs font-bold tracking-[0.06em] ${className}`}>
      {children}
    </span>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle light and dark theme"
      className="w-11 h-11 rounded-[10px] border border-border bg-card text-secondary-foreground flex items-center justify-center hover:border-input transition-colors"
    >
      <Sun className="w-[18px] h-[18px] hidden dark:block" />
      <Moon className="w-[18px] h-[18px] dark:hidden" />
    </button>
  )
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ───────── Nav ───────── */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-white border border-border flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="" width={36} height={36} className="object-contain" priority />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-heading font-bold text-[22px] tracking-tight">Ishara</span>
              <span lang="hi" className="text-[13px] text-muted-foreground">इशारा</span>
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-[15px] font-semibold text-secondary-foreground hover:text-foreground transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden sm:flex h-11 px-[18px] rounded-[10px] bg-teal hover:bg-teal-light text-white font-semibold text-[15px] items-center gap-2 transition-colors"
            >
              Enter platform <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              type="button"
              className="md:hidden w-11 h-11 rounded-[10px] border border-border bg-card flex items-center justify-center"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 text-base font-semibold text-secondary-foreground"
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/login"
              className="mt-2 h-12 rounded-xl bg-teal text-white font-semibold flex items-center justify-center gap-2"
            >
              Enter platform <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </header>

      <main>
        {/* ───────── Hero ───────── */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-[72px] sm:pb-[88px] grid lg:grid-cols-2 gap-14 items-center">
          <div className="flex flex-col gap-7">
            <span className="self-start flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-card border border-border text-[13px] font-semibold text-secondary-foreground">
              <span className="w-2 h-2 rounded-full bg-teal" />
              SANKALP SETU · College Level Hackathon 2026
            </span>
            <div className="flex flex-col gap-3.5">
              <h1 className="font-heading font-bold text-[clamp(44px,6vw,76px)] leading-[0.98] tracking-[-0.035em]">
                Bridging silence in clinical care.
              </h1>
              <p lang="hi" className="text-[22px] font-medium text-teal-ink">
                चिकित्सा देखभाल में मौन को पाटना
              </p>
            </div>
            <p className="text-[19px] leading-relaxed text-secondary-foreground max-w-[540px]">
              A real-time bridge between Deaf patients, clinical staff and certified Indian Sign Language
              interpreters — so allergies, pain and consent are never lost to guesswork.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="h-[52px] px-6 rounded-xl bg-teal hover:bg-teal-light text-white font-semibold flex items-center gap-2.5 transition-colors"
              >
                Enter platform <ArrowRight className="w-[18px] h-[18px]" />
              </Link>
              <a
                href="#how-it-works"
                className="h-[52px] px-[22px] rounded-xl bg-card border border-input font-semibold flex items-center gap-2.5 hover:border-teal transition-colors"
              >
                <Play className="w-[18px] h-[18px]" /> See how it works
              </a>
            </div>
            <dl className="mt-2 grid grid-cols-3 border-t border-border pt-[22px]">
              {STATS.map((s, i) => (
                <div
                  key={s.label}
                  className={`flex flex-col-reverse gap-1 ${i === 0 ? 'pr-4' : 'px-4 border-l border-border'}`}
                >
                  <dt className="text-[13px] leading-snug text-muted-foreground">{s.label}</dt>
                  <dd className="font-heading font-bold text-[26px] sm:text-[34px] tracking-tight tabular-nums">
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Bridge composite: one tap travelling through the system */}
          <div
            aria-label="One emergency tap travelling from patient to staff to interpreter"
            className="relative flex flex-col gap-3.5 p-5 sm:p-7 rounded-[28px] bg-teal-surface/70 dark:bg-card border border-border"
          >
            <div aria-hidden className="absolute left-[44px] sm:left-[52px] top-[60px] bottom-[60px] w-0.5 bg-teal/25" />

            <div className="relative bg-card border border-border rounded-[18px] p-[18px] flex gap-4 items-center">
              <span className="w-12 h-12 shrink-0 rounded-[14px] bg-emergency-surface text-emergency-ink flex items-center justify-center">
                <HeartPulse className="w-6 h-6" />
              </span>
              <div className="flex-1 min-w-0">
                <span className="block text-xs font-bold tracking-[0.06em] text-muted-foreground">
                  PATIENT TABLET · BED 4A
                </span>
                <span className="block font-heading font-bold text-xl">Tapped “Chest Pain”</span>
                <span lang="hi" className="block text-sm text-muted-foreground">सीने में दर्द</span>
              </div>
              <span className="text-[13px] text-muted-foreground tabular-nums">10:42:07</span>
            </div>

            <div className="relative bg-card border-2 border-emergency rounded-[18px] p-[18px] flex flex-col gap-3.5">
              <div className="flex gap-4 items-center">
                <span className="w-12 h-12 shrink-0 rounded-[14px] bg-emergency text-white flex items-center justify-center">
                  <Bell className="w-6 h-6" />
                </span>
                <div className="flex-1 min-w-0">
                  <span className="block text-xs font-bold tracking-[0.06em] text-emergency-ink">
                    P0 ALERT · STAFF CONSOLE
                  </span>
                  <span className="block font-heading font-bold text-xl">Bed 4A needs help now</span>
                  <span className="block text-sm text-muted-foreground">Raised on every staff screen instantly</span>
                </div>
              </div>
              <div className="flex gap-2" aria-hidden>
                <span className="flex-1 h-10 rounded-[10px] bg-emergency text-white font-semibold text-sm flex items-center justify-center">
                  Acknowledge
                </span>
                <span className="flex-1 h-10 rounded-[10px] bg-indigo-surface text-indigo-ink font-semibold text-sm flex items-center justify-center">
                  Page interpreter
                </span>
              </div>
            </div>

            <div className="relative bg-card border border-border rounded-[18px] p-[18px] flex gap-4 items-center">
              <span className="w-12 h-12 shrink-0 rounded-[14px] bg-indigo text-white flex items-center justify-center">
                <Video className="w-6 h-6" />
              </span>
              <div className="flex-1 min-w-0">
                <span className="block text-xs font-bold tracking-[0.06em] text-indigo-ink">ISL INTERPRETER</span>
                <span className="block font-heading font-bold text-xl">Paging standby pool…</span>
                <span className="block text-sm text-muted-foreground">Live video joins the bedside</span>
              </div>
              <span className="w-14 h-14 shrink-0 rounded-full border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo flex items-center justify-center font-heading font-bold text-lg text-indigo-ink tabular-nums">
                24s
              </span>
            </div>
          </div>
        </section>

        {/* ───────── Problem ───────── */}
        <section className="bg-card border-y border-border">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20 sm:py-24 flex flex-col gap-14">
            <div className="flex flex-col gap-4 max-w-[820px]">
              <Eyebrow className="text-emergency-ink">THE PROBLEM</Eyebrow>
              <h2 className="font-heading font-bold text-[clamp(32px,4vw,48px)] leading-[1.08] tracking-[-0.025em]">
                When a Deaf patient arrives in an emergency, the facts that matter most get lost.
              </h2>
              <p className="text-lg leading-relaxed text-secondary-foreground">
                Allergies, surgical history, where it hurts, informed consent — all of it is misread or never asked.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-10">
              {PROBLEMS.map((p, i) => (
                <div key={p.title} className="flex flex-col gap-3 pt-5 border-t-2 border-foreground">
                  <span className="font-heading font-bold text-[15px] text-muted-foreground tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-heading font-semibold text-2xl">{p.title}</h3>
                  <p className="text-base leading-relaxed text-secondary-foreground">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────── Pillars ───────── */}
        <section id="pillars" className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20 sm:py-24 flex flex-col gap-12 scroll-mt-20">
          <div className="flex flex-wrap justify-between items-end gap-6">
            <div className="flex flex-col gap-4 max-w-[680px]">
              <Eyebrow>FIVE PILLARS</Eyebrow>
              <h2 className="font-heading font-bold text-[clamp(32px,4vw,48px)] leading-[1.08] tracking-[-0.025em]">
                Built for the reality of a hospital ward.
              </h2>
            </div>
            <p className="max-w-[380px] text-base leading-relaxed text-secondary-foreground">
              Teal is clinical care, indigo is the interpreter link, and red only ever means a real emergency.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* P0 */}
            <article className="md:col-span-2 bg-card border border-border rounded-3xl p-6 sm:p-9 grid lg:grid-cols-2 gap-10 items-center">
              <div className="flex flex-col gap-4">
                <Tag className="bg-emergency-surface text-emergency-ink">P0 · CRITICAL</Tag>
                <h3 className="font-heading font-bold text-[32px] leading-[1.1]">Tactile emergency pictograms</h3>
                <p className="text-[17px] leading-relaxed text-secondary-foreground">
                  40+ high-contrast medical pictograms in Emergency, Pain, Allergy and Basic Needs, with bilingual
                  labels and a Wong-Baker pain scale. One tap on a critical card raises an audio-visual alert on
                  every staff screen.
                </p>
                <ul className="mt-1 flex flex-col gap-2.5 text-[15px] text-secondary-foreground">
                  {['WCAG AAA contrast, 56px+ touch targets', 'English + Hindi on every card'].map((t) => (
                    <li key={t} className="flex gap-2.5 items-center">
                      <Check className="w-[18px] h-[18px] text-teal-ink" strokeWidth={2.4} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {SAMPLE_PICTOGRAMS.map(({ label, hindi, icon: Icon, tone }) => (
                  <div
                    key={label}
                    className={`aspect-square rounded-2xl border-2 p-3 sm:p-3.5 flex flex-col justify-between ${TONE_CLASSES[tone]}`}
                  >
                    <Icon className="w-7 h-7 sm:w-[30px] sm:h-[30px]" strokeWidth={2.2} />
                    <span className="flex flex-col">
                      <span className="font-bold text-[13px] sm:text-[15px] leading-tight">{label}</span>
                      <span lang="hi" className="text-[11px] sm:text-xs opacity-85">{hindi}</span>
                    </span>
                  </div>
                ))}
              </div>
            </article>

            {/* P1 */}
            <article className="bg-card border border-border rounded-3xl p-6 sm:p-8 flex flex-col gap-4">
              <Tag className="bg-teal-surface text-teal-ink">P1 · AI SIGN MATCHING</Tag>
              <h3 className="font-heading font-bold text-[26px]">Doctor speaks, patient sees ISL</h3>
              <p className="text-base leading-relaxed text-secondary-foreground">
                Gemini matches Hindi, English and Hinglish clinical speech to ISL video clips. Negation guardrails stop
                “do not take this” from playing “take medicine”.
              </p>
              <div className="mt-auto flex flex-col gap-2 p-4 rounded-2xl bg-background">
                <div className="flex items-center gap-2.5 text-[15px]">
                  <span className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-secondary-foreground">
                    <Mic className="w-4 h-4" />
                  </span>
                  “Dawa le lo, ghabraiye mat”
                </div>
                <div className="flex items-center gap-2.5 text-[15px] font-semibold text-teal-ink">
                  <span className="w-8 h-8 rounded-lg bg-teal text-white flex items-center justify-center">
                    <Play className="w-4 h-4" />
                  </span>
                  ISL: Take medicine · Don’t worry
                  <span className="ml-auto font-medium text-muted-foreground tabular-nums">0.38s</span>
                </div>
              </div>
            </article>

            {/* P2 */}
            <article className="bg-card border border-border rounded-3xl p-6 sm:p-8 flex flex-col gap-4">
              <Tag className="bg-indigo-surface text-indigo-ink">P2 · LIVE INTERPRETER</Tag>
              <h3 className="font-heading font-bold text-[26px]">A human interpreter in 30 seconds</h3>
              <p className="text-base leading-relaxed text-secondary-foreground">
                Full-duplex WebRTC video over LiveKit, a 30-second escalation SLA with a live countdown, and a two-tone
                paging chime for interpreters.
              </p>
              <div className="mt-auto flex items-center gap-3.5 p-4 rounded-2xl bg-indigo-surface">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo" />
                <span className="text-[15px] font-semibold text-indigo-ink">Paging standby pool</span>
                <span className="ml-auto font-heading font-bold text-[22px] text-indigo-ink tabular-nums">00:24</span>
              </div>
            </article>

            {/* P3 */}
            <article className="bg-[#0E2A30] text-[#E9F2F2] rounded-3xl p-6 sm:p-8 flex flex-col gap-4">
              <Tag className="bg-[#1B444C] text-[#9FD8E2]">P3 · STANDOUT</Tag>
              <h3 className="font-heading font-bold text-[26px]">Sign recognition that never leaves the device</h3>
              <p className="text-base leading-relaxed text-[#BFD3D5]">
                MediaPipe tracks 21 hand landmarks and 12 facial blendshapes in WebAssembly. A Random Forest recognises
                24 clinical ISL signs. No patient video is ever uploaded.
              </p>
              <div className="mt-auto relative h-[150px] rounded-2xl bg-[#133840] overflow-hidden" aria-hidden>
                {LANDMARKS.map(([x, y], i) => (
                  <span
                    key={i}
                    className={`absolute rounded-full bg-teal-300 ${i === 0 ? 'w-2.5 h-2.5' : 'w-2 h-2'}`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                  />
                ))}
                <span className="absolute left-3.5 top-3.5 flex items-center gap-1.5 text-xs font-bold tracking-[0.06em] text-[#9FD8E2]">
                  <ShieldCheck className="w-3.5 h-3.5" /> ON-DEVICE
                </span>
                <span className="absolute right-3.5 bottom-3.5 px-2.5 py-1.5 rounded-lg bg-[#0E2A30] text-[13px] font-semibold">
                  “Pain” · 97% confidence
                </span>
              </div>
            </article>

            {/* P4 */}
            <article className="bg-card border border-border rounded-3xl p-6 sm:p-8 flex flex-col gap-4">
              <Tag className="bg-muted text-secondary-foreground">P4 · AUDIT TRAIL</Tag>
              <h3 className="font-heading font-bold text-[26px]">A medico-legal record of every exchange</h3>
              <p className="text-base leading-relaxed text-secondary-foreground">
                An immutable, timestamped event ledger with bed resolution and QR pairing, ready for clinical
                compliance.
              </p>
              <ol className="mt-auto rounded-2xl border border-border overflow-hidden text-sm">
                {[
                  ['10:42:07', 'P0 · Chest Pain tapped', true],
                  ['10:42:11', 'Acknowledged · ER nurse station', false],
                  ['10:42:30', 'Interpreter joined', false],
                ].map(([t, e, strong]) => (
                  <li key={t as string} className="flex gap-3 px-3.5 py-2.5 border-b border-border last:border-b-0">
                    <span className="text-muted-foreground tabular-nums">{t}</span>
                    <span className={strong ? 'font-semibold' : ''}>{e}</span>
                  </li>
                ))}
              </ol>
            </article>
          </div>
        </section>

        {/* ───────── How it works ───────── */}
        <section id="how-it-works" className="bg-teal text-white scroll-mt-16">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20 sm:py-24 flex flex-col gap-14">
            <div className="flex flex-col gap-4 max-w-[720px]">
              <Eyebrow className="text-teal-200">HOW IT WORKS</Eyebrow>
              <h2 className="font-heading font-bold text-[clamp(32px,4vw,48px)] leading-[1.08] tracking-[-0.025em]">
                Three portals, one bridge.
              </h2>
            </div>
            <ol className="grid md:grid-cols-3 gap-5">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="flex flex-col gap-3.5 p-7 rounded-[20px] bg-black/15">
                  <span className="flex items-center justify-between">
                    <span className="w-12 h-12 rounded-[14px] bg-white text-teal-700 flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </span>
                    <span className="font-heading font-bold text-[40px] text-teal-300/60">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </span>
                  <h3 className="font-heading font-semibold text-2xl">{title}</h3>
                  <p className="text-base leading-relaxed text-teal-100">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ───────── Technology ───────── */}
        <section id="technology" className="max-w-[1200px] mx-auto px-4 sm:px-6 py-20 grid md:grid-cols-2 gap-10 items-start scroll-mt-20">
          <div className="flex flex-col gap-3.5">
            <Eyebrow>TECHNOLOGY</Eyebrow>
            <h2 className="font-heading font-bold text-4xl leading-[1.1]">Production-grade, end to end.</h2>
          </div>
          <ul className="flex flex-wrap gap-2.5">
            {TECH.map((t) => (
              <li key={t} className="px-4 py-2.5 rounded-full bg-card border border-border text-[15px] font-semibold">
                {t}
              </li>
            ))}
          </ul>
        </section>

        {/* ───────── CTA ───────── */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-20">
          <div className="rounded-[28px] bg-band text-band-foreground p-8 sm:p-14 flex flex-wrap items-center justify-between gap-8">
            <div className="flex flex-col gap-3 max-w-[600px]">
              <h2 className="font-heading font-bold text-[clamp(30px,3.5vw,42px)] leading-[1.1]">
                Try it as a doctor, interpreter or patient.
              </h2>
              <p className="text-[17px] leading-relaxed text-white/70">
                Pre-seeded demo accounts are ready, so evaluation takes under a minute.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="h-[52px] px-6 rounded-xl bg-white text-[#0D1B1E] font-semibold flex items-center gap-2.5 hover:bg-white/90 transition-colors"
              >
                Enter platform <ArrowRight className="w-[18px] h-[18px]" />
              </Link>
              <a
                href="https://github.com/SPB-6814/Ishara_VTSP"
                target="_blank"
                rel="noopener noreferrer"
                className="h-[52px] px-[22px] rounded-xl border border-white/25 font-semibold flex items-center gap-2.5 hover:border-white/50 transition-colors"
              >
                <Code2 className="w-[18px] h-[18px]" /> View source
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-7 pb-24 flex flex-wrap justify-between gap-4 text-sm text-muted-foreground">
          <span>
            <span className="font-bold text-foreground">Ishara</span> · <span lang="hi">इशारा</span> — Bridging silence
            in clinical care with dignity and precision.
          </span>
          <span>Built for SANKALP SETU – College Level Hackathon 2026</span>
        </div>
      </footer>
    </div>
  )
}
