'use client'

import React, { useState } from 'react'
import { PictogramCard } from './pictogram-card'
import { PainScale } from './pain-scale'
import {
  EMERGENCY_P0_PICTOGRAMS,
  ALL_CATEGORY_PICTOGRAMS,
  type DetailedPictogram,
} from '@/lib/pictograms'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface PictogramGridProps {
  onTriggerAlert: (pictogram: DetailedPictogram, extraNote?: string) => void
  disabled?: boolean
}

export function PictogramGrid({ onTriggerAlert, disabled = false }: PictogramGridProps) {
  const [activeTab, setActiveTab] = useState('basic')
  const [painScaleOpen, setPainScaleOpen] = useState(false)
  const [lastTappedKey, setLastTappedKey] = useState<string | null>(null)

  const handlePictogramSelect = (pictogram: DetailedPictogram) => {
    setLastTappedKey(pictogram.key)

    if (pictogram.key === 'pain-level') {
      setPainScaleOpen(true)
      return
    }

    onTriggerAlert(pictogram)
  }

  const handlePainScaleSubmit = (level: number, label: string) => {
    const painPictogram = EMERGENCY_P0_PICTOGRAMS.find((p) => p.key === 'pain-level')!
    onTriggerAlert(painPictogram, `Pain Level: ${level}/10 (${label})`)
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Emergency row: always visible, above the fold */}
      <div className="grid grid-cols-3 gap-3" aria-label="Emergency">
        {EMERGENCY_P0_PICTOGRAMS.map((item) => (
          <PictogramCard
            key={item.key}
            pictogram={item}
            onSelect={handlePictogramSelect}
            disabled={disabled}
            selected={lastTappedKey === item.key}
          />
        ))}
      </div>

      {/* Other families */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 h-[62px] group-data-horizontal/tabs:h-[62px] p-1.5 rounded-2xl bg-muted gap-1.5">
          <TabsTrigger value="basic" className="rounded-xl h-full text-base font-semibold border-0 bg-transparent text-secondary-foreground shadow-none hover:text-foreground data-active:!bg-card data-active:!text-foreground data-active:!shadow-sm data-[state=active]:!bg-card data-[state=active]:!text-foreground after:hidden">
            Needs <span lang="hi" className="ml-1.5 text-sm font-medium opacity-80">ज़रूरतें</span>
          </TabsTrigger>
          <TabsTrigger value="pain" className="rounded-xl h-full text-base font-semibold border-0 bg-transparent text-secondary-foreground shadow-none hover:text-foreground data-active:!bg-card data-active:!text-foreground data-active:!shadow-sm data-[state=active]:!bg-card data-[state=active]:!text-foreground after:hidden">
            Pain <span lang="hi" className="ml-1.5 text-sm font-medium opacity-80">दर्द</span>
          </TabsTrigger>
          <TabsTrigger value="allergies" className="rounded-xl h-full text-base font-semibold border-0 bg-transparent text-secondary-foreground shadow-none hover:text-foreground data-active:!bg-card data-active:!text-foreground data-active:!shadow-sm data-[state=active]:!bg-card data-[state=active]:!text-foreground after:hidden">
            Allergies <span lang="hi" className="ml-1.5 text-sm font-medium opacity-80">एलर्जी</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="mt-3 outline-none">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {ALL_CATEGORY_PICTOGRAMS['Basic Needs'].map((item) => (
              <PictogramCard
                key={item.key}
                pictogram={item}
                onSelect={handlePictogramSelect}
                disabled={disabled}
                selected={lastTappedKey === item.key}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pain" className="mt-3 outline-none">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {ALL_CATEGORY_PICTOGRAMS['Pain'].map((item) => (
              <PictogramCard
                key={item.key}
                pictogram={item}
                onSelect={handlePictogramSelect}
                disabled={disabled}
                selected={lastTappedKey === item.key}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="allergies" className="mt-3 outline-none">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {ALL_CATEGORY_PICTOGRAMS['Allergies'].map((item) => (
              <PictogramCard
                key={item.key}
                pictogram={item}
                onSelect={handlePictogramSelect}
                disabled={disabled}
                selected={lastTappedKey === item.key}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Pain scale dialog modal */}
      <PainScale
        open={painScaleOpen}
        onOpenChange={setPainScaleOpen}
        onSubmit={handlePainScaleSubmit}
      />
    </div>
  )
}
