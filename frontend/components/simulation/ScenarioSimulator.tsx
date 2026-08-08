'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SlidersHorizontal,
  Flame,
  Thermometer,
  ArrowRight,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  BarChart2
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { predictApi } from '@/lib/api'
import { PredictionResult } from '@/types'

interface ScenarioSimulatorProps {
  initialLat?: number
  initialLng?: number
  initialSst?: number
  initialLocation?: string
}

export default function ScenarioSimulator({
  initialLat = 16.5,
  initialLng = 120.2,
  initialSst = 29.4,
  initialLocation = 'Coral Triangle Reef Shelf',
}: ScenarioSimulatorProps) {
  // Baseline inputs
  const [lat, setLat] = useState<number>(initialLat)
  const [lng, setLng] = useState<number>(initialLng)
  const [baseSst, setBaseSst] = useState<number>(initialSst)
  const [locationName, setLocationName] = useState<string>(initialLocation)

  // Simulation Delta variables
  const [sstDelta, setSstDelta] = useState<number>(1.5) // +1.5°C IPCC warming scenario
  const [oceanCondition, setOceanCondition] = useState<string>('heatwave') // 'baseline' | 'heatwave' | 'el_nino'

  // Calculated projected values
  const projectedSst = parseFloat((baseSst + sstDelta + (oceanCondition === 'el_nino' ? 1.0 : oceanCondition === 'heatwave' ? 0.5 : 0)).toFixed(1))

  // Predictions state
  const [baselinePred, setBaselinePred] = useState<PredictionResult | null>(null)
  const [projectedPred, setProjectedPred] = useState<PredictionResult | null>(null)

  const simulateMutation = useMutation({
    mutationFn: async () => {
      // Run baseline & projected predictions in parallel
      const [baseRes, projRes] = await Promise.all([
        predictApi.predict({
          latitude: lat,
          longitude: lng,
          sea_surface_temperature: baseSst,
          location_name: `${locationName} (Current)`,
        }),
        predictApi.predict({
          latitude: lat,
          longitude: lng,
          sea_surface_temperature: projectedSst,
          location_name: `${locationName} (Projected +${sstDelta}°C)`,
        }),
      ])
      return { baseRes, projRes }
    },
    onSuccess: (data) => {
      setBaselinePred(data.baseRes)
      setProjectedPred(data.projRes)
    },
  })

  // Comparison Chart Data
  const chartData = [
    {
      name: 'Current Baseline',
      sst: baseSst,
      probability: baselinePred ? Math.round(baselinePred.probability * 100) : 0,
      fill: '#18C8FF',
    },
    {
      name: `Projected (+${sstDelta}°C)`,
      sst: projectedSst,
      probability: projectedPred ? Math.round(projectedPred.probability * 100) : 0,
      fill: projectedPred?.prediction === 1 ? '#FF5A6E' : '#27D980',
    },
  ]

  const probDelta = projectedPred && baselinePred
    ? parseFloat(((projectedPred.probability - baselinePred.probability) * 100).toFixed(1))
    : 0

  return (
    <div className="p-6 rounded-xl border border-[#24475F] bg-[#0C1C2A] shadow-2xl space-y-6 text-[#F5FAFC]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#24475F]/60 pb-4">
        <div>
          <h2 className="font-display font-bold text-[#F5FAFC] text-base flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#18C8FF]" />
            AI Climate Scenario Simulator
          </h2>
          <p className="text-xs text-[#8FA6B8] mt-0.5">Simulate sea surface warming scenarios, marine heatwaves, and El Niño anomalies</p>
        </div>
        <span className="px-3 py-1 rounded bg-[#18C8FF]/10 text-[#18C8FF] border border-[#18C8FF]/30 text-xs font-bold uppercase tracking-wider">
          IPCC Projection Model
        </span>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-4 rounded-xl border border-[#24475F] bg-[#122535]">
        {/* Variable 1: Baseline SST */}
        <div>
          <div className="flex justify-between text-xs font-semibold text-[#8FA6B8] mb-1.5 uppercase">
            <span>Baseline SST</span>
            <span className="text-[#18C8FF] font-mono">{baseSst}°C</span>
          </div>
          <input
            type="range"
            min={20}
            max={33}
            step={0.1}
            value={baseSst}
            onChange={(e) => setBaseSst(Number(e.target.value))}
            className="w-full accent-[#18C8FF] cursor-pointer"
          />
        </div>

        {/* Variable 2: Warming Delta Slider */}
        <div>
          <div className="flex justify-between text-xs font-semibold text-[#8FA6B8] mb-1.5 uppercase">
            <span>Warming Scenario Delta</span>
            <span className="text-[#FFB547] font-mono">+{sstDelta}°C</span>
          </div>
          <input
            type="range"
            min={-1.5}
            max={4.5}
            step={0.1}
            value={sstDelta}
            onChange={(e) => setSstDelta(Number(e.target.value))}
            className="w-full accent-[#FFB547] cursor-pointer"
          />
        </div>

        {/* Variable 3: Ocean Conditions */}
        <div>
          <label className="block text-xs font-semibold text-[#8FA6B8] mb-1.5 uppercase">Ocean Condition Mode</label>
          <select
            value={oceanCondition}
            onChange={(e) => setOceanCondition(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#24475F] bg-[#07131E] text-[#F5FAFC] text-xs font-medium focus:outline-none focus:border-[#18C8FF]"
          >
            <option value="baseline">Standard Ocean Baseline</option>
            <option value="heatwave">Marine Heatwave Anomaly (+0.5°C)</option>
            <option value="el_nino">Severe El Niño Oscillation (+1.0°C)</option>
          </select>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={() => simulateMutation.mutate()}
          disabled={simulateMutation.isPending}
          className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#18C8FF] to-[#5EEAD4] text-[#07131E] font-bold text-sm hover:opacity-95 disabled:opacity-50 flex items-center gap-2 transition-all shadow-md shadow-[#18C8FF]/15 cursor-pointer"
        >
          {simulateMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-[#07131E]/30 border-t-[#07131E] rounded-full animate-spin" />
              <span>Simulating Scenario...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Execute Scenario Simulation</span>
            </>
          )}
        </button>
      </div>

      {/* Simulation Results Sequence */}
      <AnimatePresence>
        {baselinePred && projectedPred && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pt-2"
          >
            {/* Step-by-Step Scenario Pipeline */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              {/* Step 1: Current Risk */}
              <div className="p-4 rounded-xl border border-[#24475F] bg-[#122535] space-y-2">
                <span className="text-[10px] font-bold text-[#8FA6B8] uppercase tracking-wider block">1. Current Risk</span>
                <div className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase inline-block ${
                  baselinePred.prediction === 1 ? 'bg-[#FF5A6E]/15 text-[#FF5A6E]' : 'bg-[#27D980]/15 text-[#27D980]'
                }`}>
                  {baselinePred.label}
                </div>
                <div className="text-xs text-[#8FA6B8]">
                  Probability: <strong className="text-[#F5FAFC]">{(baselinePred.probability * 100).toFixed(1)}%</strong>
                </div>
                <div className="text-[11px] font-mono text-[#18C8FF]">SST: {baseSst}°C</div>
              </div>

              {/* Arrow 1 */}
              <div className="hidden md:flex justify-center text-[#18C8FF]">
                <ArrowRight className="w-6 h-6 animate-pulse" />
              </div>

              {/* Step 2: Projected Risk */}
              <div className="p-4 rounded-xl border border-[#FF5A6E]/40 bg-[#122535] space-y-2 shadow-lg shadow-[#FF5A6E]/5">
                <span className="text-[10px] font-bold text-[#FF5A6E] uppercase tracking-wider block">2. Projected Risk</span>
                <div className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase inline-block ${
                  projectedPred.prediction === 1 ? 'bg-[#FF5A6E]/15 text-[#FF5A6E]' : 'bg-[#27D980]/15 text-[#27D980]'
                }`}>
                  {projectedPred.label}
                </div>
                <div className="text-xs text-[#8FA6B8]">
                  Probability: <strong className="text-[#F5FAFC]">{(projectedPred.probability * 100).toFixed(1)}%</strong>
                </div>
                <div className="text-[11px] font-mono text-[#FF5A6E]">Projected SST: {projectedSst}°C</div>
              </div>

              {/* Step 3: Difference Delta */}
              <div className="p-4 rounded-xl border border-[#FFB547]/40 bg-[#122535] space-y-2">
                <span className="text-[10px] font-bold text-[#FFB547] uppercase tracking-wider block">3. Vulnerability Delta</span>
                <div className="text-lg font-bold font-display" style={{ color: probDelta >= 0 ? '#FF5A6E' : '#27D980' }}>
                  {probDelta >= 0 ? '+' : ''}{probDelta}% Risk
                </div>
                <div className="text-xs text-[#8FA6B8]">
                  Thermal Shift: <strong className="text-[#FFB547]">+{ (projectedSst - baseSst).toFixed(1) }°C</strong>
                </div>
              </div>
            </div>

            {/* Step 4: AI Explanation & Visualization Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 p-4 rounded-xl border border-[#24475F] bg-[#122535] space-y-2">
                <h3 className="text-xs font-bold text-[#18C8FF] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> 4. AI Scenario Explanation & Rationale
                </h3>
                <p className="text-xs text-[#F5FAFC] leading-relaxed">
                  {projectedPred.explanation ? projectedPred.explanation.replace(/\*\*/g, '') : (
                    `Simulating a +${sstDelta}°C thermal warming shift increases Sea Surface Temperature to ${projectedSst}°C. ` +
                    `This thermal load pushes corals beyond tolerance limits, elevating bleaching probability by ${probDelta}%.`
                  )}
                </p>
              </div>

              {/* Animated Visualization Chart */}
              <div className="p-4 rounded-xl border border-[#24475F] bg-[#122535]">
                <span className="text-[10px] font-bold text-[#8FA6B8] uppercase tracking-wider block mb-2">Bleaching Risk Comparison %</span>
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#8FA6B8' }} tickLine={false} axisLine={{ stroke: '#24475F' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#8FA6B8' }} tickLine={false} axisLine={{ stroke: '#24475F' }} />
                    <Tooltip contentStyle={{ background: '#07131E', borderColor: '#24475F', borderRadius: '8px', fontSize: '11px' }} />
                    <Bar dataKey="probability" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
