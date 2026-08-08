'use client'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, Calendar, Sliders, RefreshCcw } from 'lucide-react'

interface TimelinePlaybackProps {
  years?: number[]
  activeYear: number
  activeMonth?: number
  onYearChange: (year: number) => void
  onMonthChange?: (month: number) => void
  isComparing?: boolean
  onToggleCompare?: () => void
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function TimelinePlayback({
  years = [2022, 2023, 2024, 2025, 2026],
  activeYear,
  activeMonth = 8,
  onYearChange,
  onMonthChange,
  isComparing = false,
  onToggleCompare,
}: TimelinePlaybackProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 60fps / Smooth Playback loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        const nextIndex = (years.indexOf(activeYear) + 1) % years.length
        onYearChange(years[nextIndex])
      }, 1500)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, activeYear, years, onYearChange])

  return (
    <div className="p-4 rounded-xl border border-[#24475F] bg-[#0C1C2A]/95 backdrop-blur-md shadow-2xl space-y-3 text-[#F5FAFC]">
      {/* Top Controller Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#18C8FF]" />
          <span className="font-display font-bold text-xs text-[#F5FAFC]">Historical Telemetry Timeline</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#18C8FF]/15 text-[#18C8FF] border border-[#18C8FF]/30">
            {activeYear} · {MONTH_NAMES[activeMonth - 1] || 'Aug'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onToggleCompare && (
            <button
              onClick={onToggleCompare}
              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                isComparing
                  ? 'bg-[#FFB547] text-[#07131E]'
                  : 'bg-[#122535] text-[#8FA6B8] border border-[#24475F] hover:text-[#F5FAFC]'
              }`}
            >
              Year-to-Year Compare
            </button>
          )}

          {/* Play / Step Buttons */}
          <div className="flex items-center gap-1 bg-[#122535] p-1 rounded-lg border border-[#24475F]">
            <button
              onClick={() => {
                const idx = Math.max(0, years.indexOf(activeYear) - 1)
                onYearChange(years[idx])
              }}
              className="p-1 rounded hover:bg-[#07131E] text-[#8FA6B8] hover:text-[#F5FAFC] transition-colors cursor-pointer"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1 rounded hover:bg-[#07131E] text-[#18C8FF] transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => {
                const idx = Math.min(years.length - 1, years.indexOf(activeYear) + 1)
                onYearChange(years[idx])
              }}
              className="p-1 rounded hover:bg-[#07131E] text-[#8FA6B8] hover:text-[#F5FAFC] transition-colors cursor-pointer"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Year Slider Bar */}
      <div className="space-y-1">
        <input
          type="range"
          min={years[0]}
          max={years[years.length - 1]}
          step={1}
          value={activeYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="w-full accent-[#18C8FF] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-mono text-[#8FA6B8]">
          {years.map((y) => (
            <span
              key={y}
              onClick={() => onYearChange(y)}
              className={`cursor-pointer transition-colors ${
                y === activeYear ? 'text-[#18C8FF] font-bold' : 'hover:text-[#F5FAFC]'
              }`}
            >
              {y}
            </span>
          ))}
        </div>
      </div>

      {/* Monthly Filter Pills */}
      {onMonthChange && (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 border-t border-[#24475F]/60">
          {MONTH_NAMES.map((m, idx) => {
            const mNum = idx + 1
            const isSelected = mNum === activeMonth
            return (
              <button
                key={m}
                onClick={() => onMonthChange(mNum)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[#18C8FF]/20 text-[#18C8FF] border border-[#18C8FF]/40 font-bold'
                    : 'text-[#8FA6B8] hover:text-[#F5FAFC]'
                }`}
              >
                {m}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
