'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Calendar, TrendingUp, ShieldAlert, Sparkles, RefreshCw, BarChart2, Info } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { forecastingApi } from '@/lib/api'

export interface ForecastPointData {
  step_label: string
  days: number
  projected_sst: number
  projected_risk: number
  lower_bound: number
  upper_bound: number
  confidence: number
}

export interface ForecastResponseData {
  horizon: string
  latitude: number
  longitude: number
  baseline_sst: number
  current_risk: number
  projected_peak_risk: number
  trend_direction: string
  trend_confidence: number
  forecast_points: ForecastPointData[]
  summary_rationale: string
}

const horizons = [
  { id: '1_week', label: '1 Week' },
  { id: '1_month', label: '1 Month' },
  { id: '3_months', label: '3 Months' },
  { id: '6_months', label: '6 Months' },
  { id: '1_year', label: '1 Year' },
]

export default function BleachingForecastingWidget({
  latitude = 16.5,
  longitude = 120.2,
  seaSurfaceTemperature = 29.4,
}: {
  latitude?: number
  longitude?: number
  seaSurfaceTemperature?: number
}) {
  const [horizon, setHorizon] = useState<string>('1_month')

  const { data: forecast, isLoading } = useQuery<ForecastResponseData>({
    queryKey: ['bleaching-forecast', latitude, longitude, seaSurfaceTemperature, horizon],
    queryFn: () =>
      forecastingApi.predictForecast({
        latitude,
        longitude,
        sea_surface_temperature: seaSurfaceTemperature,
        horizon,
      }),
  })

  const isEscalating = forecast?.trend_direction === 'Escalating Risk'
  const badgeColor = isEscalating ? '#FF5A6E' : '#27D980'

  return (
    <div className="p-6 rounded-xl border border-[#24475F] bg-[#0C1C2A] shadow-2xl space-y-5 text-[#F5FAFC]">
      {/* Header & Horizon Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#24475F]/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#18C8FF]" />
            <h2 className="font-display font-bold text-[#F5FAFC] text-base">Coral Bleaching Predictive Forecasting</h2>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#18C8FF]/15 text-[#18C8FF] border border-[#18C8FF]/30">
              95% Confidence Interval
            </span>
          </div>
          <p className="text-xs text-[#8FA6B8] mt-0.5">Simulate multi-horizon thermal risk projections & uncertainty bands</p>
        </div>

        {/* Horizon Pill Controls */}
        <div className="flex items-center gap-1.5 bg-[#122535] p-1 rounded-lg border border-[#24475F] self-start sm:self-auto">
          {horizons.map((h) => (
            <button
              key={h.id}
              onClick={() => setHorizon(h.id)}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                horizon === h.id
                  ? 'bg-[#18C8FF] text-[#07131E] shadow-sm'
                  : 'text-[#8FA6B8] hover:text-[#F5FAFC]'
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-[#8FA6B8]">
          <div className="w-8 h-8 border-2 border-[#18C8FF]/20 border-t-[#18C8FF] rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs font-semibold">Simulating Horizon Forecast Models...</span>
        </div>
      ) : (
        forecast && (
          <div className="space-y-5">
            {/* KPI Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-[#24475F] bg-[#122535]">
                <span className="text-[10px] text-[#8FA6B8] font-bold uppercase block">Current Risk</span>
                <span className="font-display text-xl font-extrabold text-[#F5FAFC]">{forecast.current_risk}%</span>
              </div>

              <div className="p-3 rounded-lg border border-[#24475F] bg-[#122535]">
                <span className="text-[10px] text-[#8FA6B8] font-bold uppercase block">Projected Peak Risk</span>
                <span className="font-display text-xl font-extrabold" style={{ color: badgeColor }}>
                  {forecast.projected_peak_risk}%
                </span>
              </div>

              <div className="p-3 rounded-lg border border-[#24475F] bg-[#122535]">
                <span className="text-[10px] text-[#8FA6B8] font-bold uppercase block">Trend Direction</span>
                <span className="font-display text-sm font-extrabold uppercase" style={{ color: badgeColor }}>
                  {forecast.trend_direction}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-[#24475F] bg-[#122535]">
                <span className="text-[10px] text-[#8FA6B8] font-bold uppercase block">Trend Confidence</span>
                <span className="font-display text-xl font-extrabold text-[#5EEAD4]">{forecast.trend_confidence}%</span>
              </div>
            </div>

            {/* Recharts AreaChart with Uncertainty Band */}
            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast.forecast_points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="forecastRiskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={badgeColor} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={badgeColor} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="uncBandGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#18C8FF" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#18C8FF" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="step_label" tick={{ fontSize: 10, fill: '#8FA6B8' }} tickLine={false} axisLine={{ stroke: '#24475F' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#8FA6B8' }} tickLine={false} axisLine={{ stroke: '#24475F' }} />
                  <Tooltip
                    contentStyle={{ background: '#122535', borderColor: '#24475F', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any, name: any) => [`${val}%`, name === 'projected_risk' ? 'Projected Risk' : name === 'upper_bound' ? '95% CI Upper' : '95% CI Lower']}
                  />
                  <Area type="monotone" dataKey="upper_bound" name="95% CI Upper" stroke="transparent" fill="url(#uncBandGrad)" />
                  <Area type="monotone" dataKey="lower_bound" name="95% CI Lower" stroke="transparent" fill="transparent" />
                  <Area type="monotone" dataKey="projected_risk" name="Projected Risk" stroke={badgeColor} fill="url(#forecastRiskGrad)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Rationale Summary */}
            <div className="p-3.5 rounded-lg bg-[#07131E] border border-[#24475F] text-xs text-[#8FA6B8] flex items-start gap-2 leading-relaxed">
              <Info className="w-4 h-4 text-[#18C8FF] shrink-0 mt-0.5" />
              <p>{forecast.summary_rationale}</p>
            </div>
          </div>
        )
      )}
    </div>
  )
}
