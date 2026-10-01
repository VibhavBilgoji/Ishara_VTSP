'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface PainScaleProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (level: number, label: string) => void
}

const PAIN_LEVELS = [
  {
    level: 1,
    emoji: '😊',
    label: 'Very Mild',
    color:
      'bg-emerald-50 border-emerald-400 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-500 hover:text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-500/80 dark:text-emerald-200 dark:hover:bg-emerald-900/60 dark:hover:border-emerald-400 dark:hover:text-white dark:active:bg-emerald-950/90',
  },
  {
    level: 2,
    emoji: '🙂',
    label: 'Discomfort',
    color:
      'bg-emerald-50 border-emerald-400 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-500 hover:text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-500/80 dark:text-emerald-200 dark:hover:bg-emerald-900/60 dark:hover:border-emerald-400 dark:hover:text-white dark:active:bg-emerald-950/90',
  },
  {
    level: 3,
    emoji: '😐',
    label: 'Tolerable',
    color:
      'bg-lime-50 border-lime-400 text-lime-800 hover:bg-lime-100 hover:border-lime-500 hover:text-lime-950 dark:bg-lime-950/40 dark:border-lime-500/80 dark:text-lime-200 dark:hover:bg-lime-900/60 dark:hover:border-lime-400 dark:hover:text-white dark:active:bg-lime-950/90',
  },
  {
    level: 4,
    emoji: '🙁',
    label: 'Distressing',
    color:
      'bg-amber-50 border-amber-400 text-amber-800 hover:bg-amber-100 hover:border-amber-500 hover:text-amber-950 dark:bg-amber-950/40 dark:border-amber-500/80 dark:text-amber-200 dark:hover:bg-amber-900/60 dark:hover:border-amber-400 dark:hover:text-white dark:active:bg-amber-950/90',
  },
  {
    level: 5,
    emoji: '😟',
    label: 'Moderate',
    color:
      'bg-amber-50 border-amber-400 text-amber-800 hover:bg-amber-100 hover:border-amber-500 hover:text-amber-950 dark:bg-amber-950/40 dark:border-amber-500/80 dark:text-amber-200 dark:hover:bg-amber-900/60 dark:hover:border-amber-400 dark:hover:text-white dark:active:bg-amber-950/90',
  },
  {
    level: 6,
    emoji: '😣',
    label: 'Severe',
    color:
      'bg-amber-100 border-amber-500 text-amber-900 hover:bg-amber-200 hover:border-amber-600 hover:text-amber-950 dark:bg-amber-900/40 dark:border-amber-500 dark:text-amber-200 dark:hover:bg-amber-900/70 dark:hover:border-amber-300 dark:hover:text-white dark:active:bg-amber-950/90',
  },
  {
    level: 7,
    emoji: '😖',
    label: 'Very Severe',
    color:
      'bg-orange-50 border-orange-500 text-orange-900 hover:bg-orange-100 hover:border-orange-600 hover:text-orange-950 dark:bg-orange-950/40 dark:border-orange-500/80 dark:text-orange-200 dark:hover:bg-orange-900/60 dark:hover:border-orange-400 dark:hover:text-white dark:active:bg-orange-950/90',
  },
  {
    level: 8,
    emoji: '😫',
    label: 'Intense',
    color:
      'bg-orange-100 border-orange-600 text-orange-900 hover:bg-orange-200 hover:border-orange-700 hover:text-orange-950 dark:bg-orange-900/40 dark:border-orange-500 dark:text-orange-200 dark:hover:bg-orange-900/70 dark:hover:border-orange-300 dark:hover:text-white dark:active:bg-orange-950/90',
  },
  {
    level: 9,
    emoji: '😭',
    label: 'Excruciating',
    color:
      'bg-red-50 border-red-500 text-red-800 hover:bg-red-100 hover:border-red-600 hover:text-red-950 dark:bg-red-950/40 dark:border-red-500/80 dark:text-red-200 dark:hover:bg-red-900/60 dark:hover:border-red-400 dark:hover:text-white dark:active:bg-red-950/90',
  },
  {
    level: 10,
    emoji: '😱',
    label: 'Unbearable',
    color:
      'bg-red-100 border-red-600 text-red-900 font-bold hover:bg-red-200 hover:border-red-700 hover:text-red-950 dark:bg-red-900/40 dark:border-red-500 dark:text-red-100 dark:hover:bg-red-900/70 dark:hover:border-red-300 dark:hover:text-white dark:active:bg-red-950/90',
  },
]

export function PainScale({ open, onOpenChange, onSubmit }: PainScaleProps) {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)

  const handleSelect = (item: typeof PAIN_LEVELS[0]) => {
    setSelectedLevel(item.level)
    onSubmit(item.level, item.label)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl w-full p-5 sm:p-7 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800">
        <DialogHeader className="text-center space-y-1.5 pb-1">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-teal dark:text-teal-300">
            Pain Scale Rating / दर्द का स्तर
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            Tap the number that matches how much pain you feel right now.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-5 gap-2.5 sm:gap-3.5 my-5">
          {PAIN_LEVELS.map((item) => (
            <button
              key={item.level}
              type="button"
              onClick={() => handleSelect(item)}
              className={`
                flex flex-col items-center justify-between p-2.5 sm:p-3.5 py-3 sm:py-4 rounded-xl border-2
                transition-all duration-200 min-h-[96px] sm:min-h-[116px] cursor-pointer
                active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal dark:focus-visible:ring-teal-400
                shadow-xs hover:shadow-md hover:-translate-y-0.5
                ${item.color}
                ${selectedLevel === item.level ? 'ring-4 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-teal dark:ring-teal-400 scale-[1.02]' : ''}
              `}
            >
              <span className="text-2xl sm:text-3xl">{item.emoji}</span>
              <span className="text-lg sm:text-2xl font-bold my-0.5">{item.level}</span>
              <span className="text-[11px] sm:text-xs font-bold leading-tight text-center break-words max-w-full px-0.5">
                {item.label}
              </span>
            </button>
          ))}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-5 rounded-xl text-xs sm:text-sm font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close / बंद करें
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
