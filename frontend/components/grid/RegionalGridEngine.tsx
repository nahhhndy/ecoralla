'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Cpu, RefreshCw, XCircle, CheckCircle2, ShieldAlert, Sparkles, Sliders } from 'lucide-react'
import { gridApi } from '@/lib/api'

export interface GridResult {
  region_name: string
  total_grid_points: number
  high_risk_points: number
  low_risk_points: number
  high_risk_percentage: number
  avg_probability: number
  grid_results: Array<{
    latitude: number
    longitude: number
    sea_surface_temperature: number
    prediction: number
    probability: number
    confidence: number
    label: string
  }>
}

interface RegionalGridEngineProps {
  onGridComputed?: (result: GridResult) => void
}

const REGION_PRESETS = [
  { name: 'Great Barrier Reef Region', minLat: -25.0, maxLat: -10.0, minLng: 140.0, maxLng: 155.0 },
  { name: 'Coral Triangle Basin', minLat: -10.0, maxLat: 15.0, minLng: 115.0, maxLng: 140.0 },
  { name: 'Caribbean Coral Shelf', minLat: 10.0, maxLat: 28.0, minLng: -90.0, maxLng: -60.0 },
  { name: 'Red Sea Marine Corridor', minLat: 12.0, maxLat: 30.0, minLng: 32.0, maxLng: 44.0 },
]

export default function RegionalGridEngine({ onGridComputed }: RegionalGridEngineProps) {
  const [selectedPreset, setSelectedPreset] = useState<number>(0)
  const [regionName, setRegionName] = useState<string>(REGION_PRESETS[0].name)
  const [minLat, setMinLat] = useState<number>(REGION_PRESETS[0].minLat)
  const [maxLat, setMaxLat] = useState<number>(REGION_PRESETS[0].maxLat)
  const [minLng, setMinLng] = useState<number>(REGION_PRESETS[0].minLng)
  const [maxLng, setMaxLng] = useState<number>(REGION_PRESETS[0].maxLng)
  const [resolution, setResolution] = useState<number>(0.5)

  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<GridResult | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const handleSelectPreset = (idx: number) => {
    setSelectedPreset(idx)
    const p = REGION_PRESETS[idx]
    setRegionName(p.name)
    setMinLat(p.minLat)
    setMaxLat(p.maxLat)
    setMinLng(p.minLng)
    setMaxLng(p.maxLng)
  }

  const handleRunBatchInference = async () => {
    setLoading(true)
    setProgress(15)
    const controller = new AbortController()
    setAbortController(controller)

    try {
      setProgress(45)
      const data = await gridApi.predictRegion({
        region_name: regionName,
        min_latitude: minLat,
        max_latitude: maxLat,
        min_longitude: minLng,
        max_longitude: maxLng,
        grid_resolution: resolution,
      })
      setProgress(100)
      setResult(data)
      if (onGridComputed) onGridComputed(data)
    } catch (e: any) {
      if (e.name !== 'CanceledError') {
        alert('Regional batch inference failed. Please check network connection.')
      }
    } finally {
      setLoading(false)
      setAbortController(null)
    }
  }

  const handleCancel = () => {
    if (abortController) {
      abortController.abort()
      setLoading(false)
      setProgress(0)
    }
  }

  return (
    <div className="p-5 rounded-xl border border-[#24475F] bg-[#0C1C2A] shadow-2xl space-y-4 text-[#F5FAFC]">
      <div className="flex items-center justify-between border-b border-[#24475F]/60 pb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-[#18C8FF]" />
          <h3 className="font-display font-bold text-[#F5FAFC] text-sm">Global Ocean Risk & Regional Grid Engine</h3>
        </div>
        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#5EEAD4]/10 text-[#5EEAD4] border border-[#5EEAD4]/20">
          Parallel Inference Engine
        </span>
      </div>

      {/* Preset Region Buttons */}
      <div>
        <span className="text-[10px] font-bold text-[#8FA6B8] uppercase tracking-wider block mb-1.5">Region Presets</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {REGION_PRESETS.map((p, idx) => (
            <button
              key={p.name}
              onClick={() => handleSelectPreset(idx)}
              className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                selectedPreset === idx
                  ? 'border-[#18C8FF] bg-[#18C8FF]/15 font-bold text-[#F5FAFC]'
                  : 'border-[#24475F] bg-[#122535] text-[#8FA6B8] hover:text-[#F5FAFC]'
              }`}
            >
              <span className="truncate block font-semibold">{p.name}</span>
              <span className="text-[10px] text-[#8FA6B8] font-mono block">
                {p.minLat}° to {p.maxLat}°
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bounding Box Inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 rounded-lg bg-[#122535] border border-[#24475F]/60 text-xs">
        <div>
          <label className="text-[10px] font-bold text-[#8FA6B8] uppercase block mb-1">Min Lat (°)</label>
          <input
            type="number"
            value={minLat}
            onChange={(e) => setMinLat(Number(e.target.value))}
            className="w-full px-2.5 py-1.5 rounded border border-[#24475F] bg-[#07131E] text-[#F5FAFC] text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#8FA6B8] uppercase block mb-1">Max Lat (°)</label>
          <input
            type="number"
            value={maxLat}
            onChange={(e) => setMaxLat(Number(e.target.value))}
            className="w-full px-2.5 py-1.5 rounded border border-[#24475F] bg-[#07131E] text-[#F5FAFC] text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#8FA6B8] uppercase block mb-1">Min Lng (°)</label>
          <input
            type="number"
            value={minLng}
            onChange={(e) => setMinLng(Number(e.target.value))}
            className="w-full px-2.5 py-1.5 rounded border border-[#24475F] bg-[#07131E] text-[#F5FAFC] text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#8FA6B8] uppercase block mb-1">Max Lng (°)</label>
          <input
            type="number"
            value={maxLng}
            onChange={(e) => setMaxLng(Number(e.target.value))}
            className="w-full px-2.5 py-1.5 rounded border border-[#24475F] bg-[#07131E] text-[#F5FAFC] text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#8FA6B8] uppercase block mb-1">Step (deg)</label>
          <input
            type="number"
            step="0.1"
            value={resolution}
            onChange={(e) => setResolution(Number(e.target.value))}
            className="w-full px-2.5 py-1.5 rounded border border-[#24475F] bg-[#07131E] text-[#F5FAFC] text-xs"
          />
        </div>
      </div>

      {/* Progress & Run Actions */}
      <div className="flex items-center justify-between pt-1">
        {loading ? (
          <div className="flex-1 mr-4 flex items-center gap-3">
            <div className="flex-1 bg-[#122535] rounded-full h-2 overflow-hidden border border-[#24475F]">
              <div
                className="bg-gradient-to-r from-[#18C8FF] to-[#5EEAD4] h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-mono text-[#18C8FF] font-bold">{progress}%</span>
            <button
              onClick={handleCancel}
              className="px-2.5 py-1 rounded bg-[#FF5A6E]/15 text-[#FF5A6E] border border-[#FF5A6E]/30 text-xs font-semibold hover:bg-[#FF5A6E]/25 transition-all flex items-center gap-1 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        ) : (
          <div className="text-xs text-[#8FA6B8]">
            Estimated Grid Points: <strong className="text-[#F5FAFC]">{Math.round(((maxLat - minLat) / resolution) * ((maxLng - minLng) / resolution))} pts</strong>
          </div>
        )}

        {!loading && (
          <button
            onClick={handleRunBatchInference}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#18C8FF] to-[#5EEAD4] text-[#07131E] font-bold text-xs hover:opacity-95 transition-all flex items-center gap-2 shadow-md shadow-[#18C8FF]/15 cursor-pointer"
          >
            <Cpu className="w-4 h-4" /> Run Parallel Regional Inference
          </button>
        )}
      </div>

      {/* Results Summary */}
      {result && (
        <div className="p-3 rounded-lg border border-[#18C8FF]/30 bg-[#07131E] flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-[#F5FAFC]">{result.region_name}</span>
            <div className="text-[11px] text-[#8FA6B8] mt-0.5">
              Evaluated {result.total_grid_points} grid points ({result.high_risk_points} high vulnerability)
            </div>
          </div>
          <div className="text-right">
            <span className="font-display font-bold text-sm text-[#FF5A6E]">{result.high_risk_percentage}%</span>
            <span className="text-[10px] text-[#8FA6B8] block">Regional Vulnerability</span>
          </div>
        </div>
      )}
    </div>
  )
}
