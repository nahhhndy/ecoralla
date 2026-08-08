'use client'
import dynamic from 'next/dynamic'
import { useState, useCallback } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Compass,
  Sparkles,
  SlidersHorizontal,
  MapPin,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FolderKanban,
  CheckCircle2,
  Info
} from 'lucide-react'
import { environmentalApi, predictApi, workspaceApi, historyApi } from '@/lib/api'
import { PredictionResult, PaginatedHistory } from '@/types'
import { getRiskCategory } from '@/components/map/EcoMap'

// Dynamic import for Leaflet map (prevents SSR window errors)
const EcoMap = dynamic(() => import('@/components/map/EcoMap'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-full bg-[#07131E] text-[#F5FAFC]">
      <div className="w-10 h-10 border-2 border-[#18C8FF]/20 border-t-[#18C8FF] rounded-full animate-spin mb-3" />
      <span className="text-xs font-semibold tracking-wider text-[#8FA6B8] uppercase">
        Initializing EcoRal GIS Ocean Engine...
      </span>
    </div>
  ),
})

async function getOceanRegionName(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=5`,
      { headers: { 'User-Agent': 'EcoRal/1.0' } }
    )
    if (res.ok) {
      const data = await res.json()
      if (data.display_name) {
        const parts = data.display_name.split(',')
        return parts.slice(0, 2).join(',').trim()
      }
    }
  } catch (e) {}

  const absLat = Math.abs(lat)
  let name = 'Ocean Transect'
  if (lng > 100 && lng < 160 && lat > -20 && lat < 25) name = 'Coral Triangle Reef Basin'
  else if (lng > 140 && lng < 155 && lat > -25 && lat < -10) name = 'Great Barrier Reef Outer Edge'
  else if (lng > -90 && lng < -60 && lat > 10 && lat < 30) name = 'Caribbean Barrier Reef'
  else if (lng > 30 && lng < 50 && lat > 10 && lat < 30) name = 'Red Sea Coral Corridor'
  else if (lng > 60 && lng < 95 && lat > -15 && lat < 15) name = 'Maldives Atoll Sector'
  else if (lng > -180 && lng < -100) name = 'Pacific Remote Islands Sanctuary'
  else if (lng >= -60 && lng <= 20) name = 'Atlantic Ocean Shelf'

  const NS = lat >= 0 ? 'N' : 'S'
  const EW = lng >= 0 ? 'E' : 'W'
  return `${name} (${absLat.toFixed(1)}°${NS}, ${Math.abs(lng).toFixed(1)}°${EW})`
}

async function fetchSeaSurfaceTemp(lat: number, lng: number): Promise<number> {
  try {
    const res = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}&hourly=sea_surface_temperature&forecast_days=1`
    )
    if (res.ok) {
      const data = await res.json()
      const temps = data.hourly?.sea_surface_temperature
      if (temps && temps.length > 0) {
        const validTemps = temps.filter((t: number | null) => t !== null) as number[]
        if (validTemps.length > 0) {
          const avg = validTemps.reduce((a, b) => a + b, 0) / validTemps.length
          return parseFloat(avg.toFixed(1))
        }
      }
    }
  } catch (e) {}

  const absLat = Math.abs(lat)
  let baseSst = 29.5 - (absLat / 90) * 28.0
  const noise = (Math.sin(lat * 0.1) + Math.cos(lng * 0.1)) * 0.8
  baseSst = Math.max(-1.5, Math.min(34.0, baseSst + noise))
  return parseFloat(baseSst.toFixed(1))
}

export default function MapPage() {
  const qc = useQueryClient()
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [regionName, setRegionName] = useState<string>('Select Target Location')
  const [sst, setSst] = useState<number>(29.4)
  const [fetchingSst, setFetchingSst] = useState<boolean>(false)
  const [showManualSst, setShowManualSst] = useState<boolean>(false)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResult | null>(null)

  // Fetch real database prediction observations
  const { data: historyData } = useQuery<PaginatedHistory>({
    queryKey: ['history'],
    queryFn: () => historyApi.list(1, 100),
  })

  // Fetch research workspace projects for optional save action
  const { data: projects = [] } = useQuery({
    queryKey: ['workspace-projects'],
    queryFn: workspaceApi.listProjects,
  })

  // Mutation to execute real XGBoost ML prediction
  const predictMutation = useMutation({
    mutationFn: predictApi.predict,
    onSuccess: (data: PredictionResult) => {
      setCurrentPrediction(data)
      setSavedNotice(null)
      // Invalidate queries so history and dashboard update immediately
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['trends'] })
      qc.invalidateQueries({ queryKey: ['history'] })
    },
  })

  // Mutation to save prediction to Research Workspace project
  const saveToWorkspaceMutation = useMutation({
    mutationFn: async ({ projectId, pred }: { projectId: string; pred: PredictionResult }) => {
      return workspaceApi.addExperiment(projectId, {
        title: pred.location_name || `Observation ${pred.latitude}°, ${pred.longitude}°`,
        latitude: pred.latitude,
        longitude: pred.longitude,
        sea_surface_temperature: pred.sea_surface_temperature,
        prediction: pred.prediction,
        probability: pred.probability,
        confidence: pred.confidence,
        notes: `Saved from Ocean Map GIS analysis (${pred.sea_surface_temperature}°C)`,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-projects'] })
      setSavedNotice('Added prediction record to Research Workspace!')
    },
  })

  // Map Click Handler: fetches SST & telemetry for chosen coordinates
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    const coords = { lat: parseFloat(lat.toFixed(4)), lng: parseFloat(lng.toFixed(4)) }
    setSelectedCoords(coords)
    setFetchingSst(true)
    setSavedNotice(null)

    try {
      const telemetry = await environmentalApi.getTelemetry(coords.lat, coords.lng)
      setRegionName(telemetry.region_name)
      setSst(telemetry.sea_surface_temperature)
    } catch (e) {
      const [fetchedName, fetchedSst] = await Promise.all([
        getOceanRegionName(lat, lng),
        fetchSeaSurfaceTemp(lat, lng),
      ])
      setRegionName(fetchedName)
      setSst(fetchedSst)
    } finally {
      setFetchingSst(false)
    }
  }, [])

  // Execute prediction API
  const handlePredict = () => {
    if (!selectedCoords) return
    setSavedNotice(null)
    predictMutation.mutate({
      latitude: selectedCoords.lat,
      longitude: selectedCoords.lng,
      sea_surface_temperature: sst,
      location_name: regionName,
    })
  }

  const predictionsList = historyData?.items || []

  return (
    <div className="relative w-full h-full bg-[#07131E] overflow-hidden text-[#F5FAFC]">
      {/* Full-Screen Leaflet GIS Map */}
      <EcoMap
        onMapClick={handleMapClick}
        selectedCoords={selectedCoords}
        regionName={regionName}
        sst={sst}
        predictions={predictionsList}
        currentPrediction={currentPrediction}
      />

      {/* Map Legend (Bottom Right) */}
      <div className="absolute bottom-6 right-6 z-[1000] pointer-events-auto">
        <div className="p-3.5 rounded-xl border border-[#24475F] bg-[#0C1C2A]/95 backdrop-blur-md shadow-2xl space-y-2 text-xs text-[#F5FAFC] min-w-[200px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#18C8FF] block mb-1">
            Bleaching Risk Legend
          </span>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#27D980]" />
              <span className="text-[#8FA6B8]">Low Risk (&lt;35% Prob)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFB547]" />
              <span className="text-[#8FA6B8]">Moderate Risk (35-50% Prob)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A6E]" />
              <span className="text-[#8FA6B8]">High Risk (50-75% Prob)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48]" />
              <span className="text-[#8FA6B8]">Critical Risk (&ge;75% Prob)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Zero Observations Empty State Overlay Banner */}
      {predictionsList.length === 0 && (
        <div className="absolute top-4 right-4 z-[1000] max-w-sm pointer-events-auto">
          <div className="p-3.5 rounded-xl border border-[#18C8FF]/40 bg-[#0C1C2A]/95 backdrop-blur-md shadow-2xl flex items-start gap-3 text-xs text-[#F5FAFC]">
            <Info className="w-4 h-4 text-[#18C8FF] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#18C8FF]">No environmental observations yet</p>
              <p className="text-[11px] text-[#8FA6B8] mt-0.5">
                Select a reef location on the map to run your first bleaching risk assessment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Interactive Predictor Control Card */}
      <div className="absolute top-4 left-4 z-[1000] w-full max-w-sm px-4 sm:px-0 pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#24475F] bg-[#0C1C2A]/95 backdrop-blur-md shadow-2xl p-5 space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto"
        >
          <div className="flex items-center justify-between border-b border-[#24475F]/60 pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#18C8FF]" />
              <h2 className="font-display font-bold text-[#F5FAFC] text-sm">Ocean Risk Predictor</h2>
            </div>
            <span className="text-[10px] font-mono text-[#5EEAD4] bg-[#5EEAD4]/10 border border-[#5EEAD4]/20 px-2 py-0.5 rounded font-bold">
              {predictionsList.length} Saved Observations
            </span>
          </div>

          {/* Visible Error Banner */}
          {predictMutation.isError && (
            <div className="p-3 rounded-lg border border-[#FF5A6E]/40 bg-[#FF5A6E]/10 text-[#FF5A6E] text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Environmental intelligence service unavailable</span>
              </div>
              <p className="text-[11px] text-[#8FA6B8]">
                Unable to complete prediction. Please verify API service connectivity.
              </p>
              <button
                onClick={handlePredict}
                className="px-3 py-1 rounded bg-[#FF5A6E] text-[#07131E] font-bold text-[10px] uppercase hover:opacity-90 transition-all cursor-pointer"
              >
                Retry Prediction
              </button>
            </div>
          )}

          {/* Save Notice */}
          {savedNotice && (
            <div className="p-2.5 rounded-lg border border-[#27D980]/40 bg-[#27D980]/10 text-[#27D980] text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {savedNotice}
              </span>
              <button onClick={() => setSavedNotice(null)} className="text-[10px] font-bold hover:underline">
                Dismiss
              </button>
            </div>
          )}

          {/* Selected Location Details */}
          {selectedCoords ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-[#24475F] bg-[#122535]">
                <span className="text-[10px] font-bold text-[#8FA6B8] uppercase tracking-wider block mb-1">
                  Target Location
                </span>
                <p className="text-xs font-bold text-[#F5FAFC] truncate">{regionName}</p>
                <div className="flex items-center gap-2 mt-1 font-mono text-[11px] text-[#18C8FF]">
                  <MapPin className="w-3 h-3 text-[#18C8FF]" />
                  <span>
                    {selectedCoords.lat > 0 ? `${selectedCoords.lat}°N` : `${Math.abs(selectedCoords.lat)}°S`},{' '}
                    {selectedCoords.lng > 0 ? `${selectedCoords.lng}°E` : `${Math.abs(selectedCoords.lng)}°W`}
                  </span>
                </div>
              </div>

              {/* SST Controls */}
              <div className="p-3 rounded-lg border border-[#24475F] bg-[#122535]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#8FA6B8] uppercase tracking-wider">
                    Sea Surface Temperature
                  </span>
                  {fetchingSst ? (
                    <div className="flex items-center gap-1 text-[11px] text-[#18C8FF]">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Fetching...
                    </div>
                  ) : (
                    <span className="font-mono font-bold text-xs text-[#5EEAD4]">{sst}°C</span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#24475F]/60">
                  <button
                    onClick={() => setShowManualSst(!showManualSst)}
                    className="text-[11px] text-[#8FA6B8] hover:text-[#F5FAFC] flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <SlidersHorizontal className="w-3 h-3 text-[#18C8FF]" />
                    {showManualSst ? 'Hide Temperature Slider' : 'Tweak Temperature Manually'}
                    {showManualSst ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {showManualSst && (
                  <div className="mt-3 pt-2 border-t border-[#24475F]">
                    <input
                      type="range"
                      min={-2}
                      max={40}
                      step={0.1}
                      value={sst}
                      onChange={(e) => setSst(Number(e.target.value))}
                      className="w-full accent-[#18C8FF] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-[#8FA6B8] mt-1 font-mono">
                      <span>-2°C</span>
                      <span>28.5°C</span>
                      <span>40°C</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Analyze Risk Button */}
              <button
                onClick={handlePredict}
                disabled={predictMutation.isPending || fetchingSst}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-[#18C8FF] to-[#5EEAD4] text-[#07131E] font-bold text-sm hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#18C8FF]/20 cursor-pointer"
              >
                {predictMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#07131E]/30 border-t-[#07131E] rounded-full animate-spin" />
                    <span>Analyzing Risk...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze Risk</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="py-6 text-center text-[#8FA6B8]">
              <Compass className="w-8 h-8 text-[#18C8FF] mx-auto mb-2 animate-bounce" />
              <p className="text-xs font-bold text-[#F5FAFC]">Click Any Ocean Location on Map</p>
            </div>
          )}

          {/* Prediction Result Display */}
          <AnimatePresence>
            {currentPrediction && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 rounded-xl border bg-[#07131E] space-y-3"
                style={{ borderColor: getRiskCategory(currentPrediction.probability).color }}
              >
                <div className="flex items-center justify-between">
                  {(() => {
                    const cat = getRiskCategory(currentPrediction.probability)
                    return (
                      <span
                        className="px-2.5 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wider"
                        style={{ color: cat.color, backgroundColor: cat.bg, border: `1px solid ${cat.color}40` }}
                      >
                        {cat.label} RISK
                      </span>
                    )
                  })()}

                  <span className="text-[11px] font-mono text-[#8FA6B8]">
                    Prob: <strong className="text-[#F5FAFC]">{(currentPrediction.probability * 100).toFixed(1)}%</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-[#122535] border border-[#24475F]/60">
                    <span className="text-[#8FA6B8] text-[9px] uppercase block">Model Confidence</span>
                    <span className="font-bold text-[#5EEAD4]">{(currentPrediction.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="p-2 rounded bg-[#122535] border border-[#24475F]/60">
                    <span className="text-[#8FA6B8] text-[9px] uppercase block">SST Input</span>
                    <span className="font-bold text-[#18C8FF]">{currentPrediction.sea_surface_temperature}°C</span>
                  </div>
                </div>

                {currentPrediction.explanation && (
                  <p className="text-[11px] text-[#8FA6B8] leading-relaxed border-t border-[#24475F] pt-2">
                    {currentPrediction.explanation.replace(/\*\*/g, '').slice(0, 140)}...
                  </p>
                )}

                {/* Save to Workspace CTA */}
                {projects.length > 0 && (
                  <div className="pt-2 border-t border-[#24475F]">
                    <button
                      onClick={() => {
                        if (projects[0]) {
                          saveToWorkspaceMutation.mutate({ projectId: projects[0].id, pred: currentPrediction })
                        }
                      }}
                      disabled={saveToWorkspaceMutation.isPending}
                      className="w-full py-1.5 rounded bg-[#122535] border border-[#24475F] text-[#5EEAD4] text-[11px] font-bold hover:border-[#5EEAD4] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <FolderKanban className="w-3.5 h-3.5" /> Save to Research Workspace
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
