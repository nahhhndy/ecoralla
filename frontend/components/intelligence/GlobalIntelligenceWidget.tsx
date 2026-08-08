'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, RefreshCw, Radio, Sparkles, MapPin, Activity, ShieldAlert, Clock, ArrowUpRight } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { intelligenceApi } from '@/lib/api'

export interface RegionSnapshotData {
  region_id: string
  region_name: string
  latitude: number
  longitude: number
  sea_surface_temperature: number
  prediction: number
  probability: number
  confidence: number
  label: string
  risk_score: number
  last_updated: string
  historical_trend: Array<{ date: string; risk: number }>
  metadata: { biome: string; country: string }
}

export default function GlobalIntelligenceWidget() {
  const qc = useQueryClient()

  const { data: summary, isLoading } = useQuery<RegionSnapshotData[]>({
    queryKey: ['global-intelligence-summary'],
    queryFn: intelligenceApi.getSummary,
    refetchInterval: 30000, // Background polling every 30 seconds
  })

  const scanMutation = useMutation({
    mutationFn: intelligenceApi.triggerScan,
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ['global-intelligence-summary'] }), 1500)
    },
  })

  return (
    <div className="p-6 rounded-xl border border-[#24475F] bg-[#0C1C2A] shadow-2xl space-y-5 text-[#F5FAFC]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#24475F]/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#18C8FF] animate-pulse" />
            <h2 className="font-display font-bold text-[#F5FAFC] text-base">Global Background Intelligence Engine</h2>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#18C8FF]/15 text-[#18C8FF] border border-[#18C8FF]/30">
              7 Reef Systems Active
            </span>
          </div>
          <p className="text-xs text-[#8FA6B8] mt-0.5">Automated background prediction scan & ocean telemetry refresh</p>
        </div>

        <button
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
          className="px-4 py-2 rounded-lg bg-[#122535] border border-[#24475F] text-[#18C8FF] font-bold text-xs hover:border-[#18C8FF] transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanMutation.isPending ? 'animate-spin' : ''}`} />
          {scanMutation.isPending ? 'Scanning Global Regions...' : 'Trigger Background Scan'}
        </button>
      </div>

      {/* Grid of 7 Global Regions */}
      {isLoading ? (
        <div className="py-12 text-center text-[#8FA6B8]">
          <div className="w-8 h-8 border-2 border-[#18C8FF]/20 border-t-[#18C8FF] rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs font-semibold">Loading Global Intelligence Streams...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {summary?.map((reg) => {
            const isHighRisk = reg.prediction === 1
            const badgeColor = isHighRisk ? '#FF5A6E' : '#27D980'

            return (
              <motion.div
                key={reg.region_id}
                whileHover={{ y: -3 }}
                className="p-4 rounded-xl border border-[#24475F] bg-[#122535] hover:border-[#18C8FF]/50 transition-all space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-xs text-[#F5FAFC] truncate">{reg.region_name}</span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0"
                      style={{
                        color: badgeColor,
                        backgroundColor: isHighRisk ? 'rgba(255,90,110,0.15)' : 'rgba(39,217,128,0.15)',
                        border: `1px solid ${isHighRisk ? 'rgba(255,90,110,0.3)' : 'rgba(39,217,128,0.3)'}`,
                      }}
                    >
                      {reg.label}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#8FA6B8] flex items-center justify-between font-mono">
                    <span>{reg.metadata.country}</span>
                    <span className="text-[#18C8FF] font-bold">{reg.sea_surface_temperature}°C</span>
                  </div>
                </div>

                {/* Trend Sparkline */}
                <div className="h-10 my-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reg.historical_trend} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                      <Area type="monotone" dataKey="risk" stroke={badgeColor} fill={badgeColor} fillOpacity={0.15} strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="pt-2 border-t border-[#24475F]/60 flex items-center justify-between text-[10px] text-[#8FA6B8]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#18C8FF]" /> {reg.last_updated}
                  </span>
                  <span className="font-mono font-bold text-[#F5FAFC]">
                    Score: <strong style={{ color: badgeColor }}>{reg.risk_score}%</strong>
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
