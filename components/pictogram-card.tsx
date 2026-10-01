'use client'

import React from 'react'
import type { DetailedPictogram } from '@/lib/pictograms'
import {
  HeartPulse,
  Activity,
  ShieldAlert,
  GlassWater,
  Toilet,
  Snowflake,
  ThermometerSun,
  Flame,
  Pill,
  Brain,
  Clock,
  CheckCircle,
  UtensilsCrossed,
  HelpCircle,
} from 'lucide-react'

// ─── Custom Medical & Anatomy Pictogram Avatars ──────────────────────────────

function LungsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v7" />
      <path d="M12 10c-1.5 0-3 1-3.5 2.5C7.2 16 5.8 18 3.5 18c-.8 0-1.5-.7-1.5-1.5 0-4 2.8-8.5 7-9.5" />
      <path d="M12 10c1.5 0 3 1 3.5 2.5 1.3 3.5 2.7 5.5 5 5.5.8 0 1.5-.7 1.5-1.5 0-4-2.8-8.5-7-9.5" />
      <path d="M7 15.5c1-1.8 2-2.5 5-2.5" />
      <path d="M17 15.5c-1-1.8-2-2.5-5-2.5" />
    </svg>
  )
}

function DoctorAvatarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
      <path d="M8 11.5a4 4 0 0 0 8 0" />
      <path d="M16 11.5v2.5a2 2 0 0 1-2 2h-1" />
      <circle cx="13" cy="16" r="1" fill="currentColor" />
    </svg>
  )
}

function DizzyAvatarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      {/* Dizzy X eyes */}
      <path d="M8 9.5l2 2m0-2l-2 2" />
      <path d="M14 9.5l2 2m0-2l-2 2" />
      {/* Wobbly mouth */}
      <path d="M8.5 15.5c1-1 2.2-1 3.5 0s2.5 1 3.5 0" />
      {/* Orbiting halo/swirl */}
      <path d="M12 2.5a3.5 1.5 0 1 1-3 2" strokeDasharray="2 2" />
    </svg>
  )
}

function NauseousIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="9.5" r="1" fill="currentColor" />
      <circle cx="15" cy="9.5" r="1" fill="currentColor" />
      {/* Queasy wavy expression */}
      <path d="M8.5 16c1.5-1.5 2.5-1 3.5-1s2 .5 3.5-1" />
      <path d="M8 6.5c1-.5 2-.5 3.5 0" />
      <path d="M12.5 6.5c1-.5 2-.5 3.5 0" />
    </svg>
  )
}

function StomachPainIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 21V10a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v11" />
      <circle cx="12" cy="14" r="2.5" />
      <path d="M12 9.5v2" />
      <path d="M12 16.5v2" />
      <path d="M9.5 14H7.5" />
      <path d="M16.5 14h-2" />
    </svg>
  )
}

function BackPainIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2.5v19" />
      <path d="M9 5h6" />
      <path d="M8.5 8.5h7" />
      <path d="M8 12h8" />
      <path d="M8.5 15.5h7" />
      <path d="M9 19h6" />
      {/* Focal pain beacon at lumbar/sacral */}
      <circle cx="12" cy="15.5" r="2.5" fill="currentColor" fillOpacity="0.25" />
    </svg>
  )
}

function LatexAllergyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Medical Glove Hand */}
      <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v4" />
      <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v6" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.7-2.6L3.5 15.8a1.5 1.5 0 0 1 2.3-1.9L8 16" />
      {/* Alert cross slash */}
      <line x1="3" y1="3" x2="21" y2="21" stroke="#DC2626" strokeWidth="2.5" />
    </svg>
  )
}

// ─── Complete Medical Icon Dictionary ────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  // Emergency Triage
  HeartPulse,
  Lungs: LungsIcon,
  DoctorAvatar: DoctorAvatarIcon,
  Activity,
  ShieldAlert,
  DizzyAvatar: DizzyAvatarIcon,
  GlassWater,
  Toilet,
  Nauseous: NauseousIcon,

  // Basic Needs
  Snowflake,
  ThermometerSun,
  Flame,
  UtensilsCrossed,

  // Anatomy & Pain
  Brain,
  StomachPain: StomachPainIcon,
  BackPain: BackPainIcon,
  Clock,

  // Allergies
  Pill,
  LatexAllergy: LatexAllergyIcon,
  CheckCircle,
}

interface PictogramCardProps {
  pictogram: DetailedPictogram
  onSelect: (pictogram: DetailedPictogram) => void
  disabled?: boolean
  selected?: boolean
}

export function PictogramCard({
  pictogram,
  onSelect,
  disabled = false,
  selected = false,
}: PictogramCardProps) {
  const IconComponent = ICON_MAP[pictogram.icon] || HelpCircle

  const isUrgent = pictogram.priority === 'P0'

  return (
    <button
      type="button"
      onClick={() => onSelect(pictogram)}
      disabled={disabled}
      aria-label={`${pictogram.label} - ${pictogram.description}`}
      className={`
        group relative flex flex-col justify-between gap-3 p-4 rounded-[18px] text-left
        ${isUrgent ? 'border-[3px]' : 'border-2'}
        transition-all duration-200 ease-out select-none cursor-pointer
        min-h-[120px] sm:min-h-[136px] w-full
        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring
        active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none
        hover:-translate-y-0.5
        ${pictogram.color}
        ${selected ? 'ring-4 ring-offset-2 ring-offset-background ring-ring' : ''}
      `}
    >
      <span className="w-full flex items-start justify-between gap-2">
        <IconComponent className="w-9 h-9 sm:w-10 sm:h-10 stroke-[2.2] shrink-0" />
        {isUrgent && (
          <span className="px-1.5 py-0.5 rounded-[4px] text-[11px] font-bold tracking-[0.06em] bg-emergency text-white">
            URGENT
          </span>
        )}
      </span>

      <span className="w-full flex flex-col">
        <span className="font-bold text-lg sm:text-[21px] leading-tight line-clamp-2">{pictogram.label}</span>
        {pictogram.hindiText && (
          <span lang="hi" className="text-sm sm:text-[15px] font-medium opacity-85 line-clamp-1 mt-0.5">
            {pictogram.hindiText}
          </span>
        )}
      </span>
    </button>
  )
}
