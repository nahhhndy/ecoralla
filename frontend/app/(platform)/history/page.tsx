'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import {
  History,
  Search,
  Filter,
  Download,
  FileText,
  Clock,
  MapPin,
  Sparkles,
  BarChart2,
  List,
  Map as MapIcon,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  X,
  Database,
  ExternalLink,
  Trash2,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { historyApi, reportsApi } from '@/lib/api'
import { PredictionHistoryItem } from '@/types'
import { useToast } from '@/lib/providers'

// Dynamic import for Leaflet map view
const EcoMap = dynamic(() => import('@/components/map/EcoMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-[#07131E]">
      <div className="w-8 h-8 border-2 border-[#18C8FF]/20 border-t-[#18C8FF] rounded-full animate-spin" />
    </div>
  ),
})

function RiskBadge({ prediction }: { prediction: 0 | 1 }) {
  return (
    <span className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wider ${
      prediction === 1
        ? 'bg-[#FF5A6E]/15 text-[#FF5A6E] border border-[#FF5A6E]/30'
        : 'bg-[#27D980]/15 text-[#27D980] border border-[#27D980]/30'
    }`}>
      {prediction === 1 ? 'High Risk' : 'Low Risk'}
    </span>
  )
}

export default function HistoryPage() {
  const qc = useQueryClient()
  const { showToast, confirm } = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'low'>('all')
  const [activeTab, setActiveTab] = useState<'timeline' | 'table' | 'map'>('timeline')

  // Selected items for comparison
  const [compareItems, setCompareItems] = useState<[PredictionHistoryItem | null, PredictionHistoryItem | null]>([null, null])
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['history', page],
    queryFn: () => historyApi.list(page, 50),
  })

  const generateReportMutation = useMutation({
    mutationFn: (predId: string) => reportsApi.generate({ prediction_id: predId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] })
      showToast('Report generation started. Your report will appear in Reports & Export when ready.', 'info')
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.detail || 'Report generation failed. Please try again.', 'error')
    },
  })

  const deletePredictionMutation = useMutation({
    mutationFn: (predId: string) => historyApi.delete(predId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['history'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['trends'] })
      qc.invalidateQueries({ queryKey: ['analytics-detailed'] })
      showToast('Prediction observation deleted. Telemetry metrics recalculated.', 'success')
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.detail || 'Failed to delete prediction record.', 'error')
    },
    onSettled: () => {
      setDeletingId(null)
    },
  })

  const handleDeletePrediction = async (item: PredictionHistoryItem) => {
    const confirmed = await confirm({
      title: 'Delete Observation Record?',
      message: `Delete observation record at ${item.location_name || `${item.latitude}°, ${item.longitude}°`} (${item.sea_surface_temperature}°C, ${(item.probability * 100).toFixed(1)}% Risk)? This will update all dashboard telemetry metrics.`,
      confirmText: 'Delete Observation',
      isDestructive: true,
    })

    if (confirmed) {
      setDeletingId(item.id)
      deletePredictionMutation.mutate(item.id)
    }
  }

  const rawItems: PredictionHistoryItem[] = data?.items || []

  // Client-side filtering & searching
  const filteredItems = useMemo(() => {
    return rawItems.filter(item => {
      if (riskFilter === 'high' && item.prediction !== 1) return false
      if (riskFilter === 'low' && item.prediction !== 0) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      const loc = (item.location_name || '').toLowerCase()
      const coords = `${item.latitude},${item.longitude}`
      return loc.includes(q) || coords.includes(q) || item.label.toLowerCase().includes(q)
    })
  }, [rawItems, search, riskFilter])

  // Trend data for mini chart
  const trendData = useMemo(() => {
    return [...rawItems]
      .reverse()
      .slice(0, 20)
      .map(item => ({
        date: new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        probability: Math.round(item.probability * 100),
      }))
  }, [rawItems])

  const handleSelectForCompare = (item: PredictionHistoryItem) => {
    if (!compareItems[0]) {
      setCompareItems([item, null])
      showToast(`Selected "${item.location_name || 'Observation 1'}" for comparison. Select a second record.`, 'info')
    } else if (!compareItems[1] && compareItems[0].id !== item.id) {
      setCompareItems([compareItems[0], item])
      setShowCompareModal(true)
    } else {
      setCompareItems([item, null])
      showToast(`Reset comparison. Selected "${item.location_name || 'Observation 1'}" as primary.`, 'info')
    }
  }

  const handleExportCSV = () => {
    if (filteredItems.length === 0) return
    const headers = ['ID,Location,Latitude,Longitude,SST (°C),Prediction,Probability,Confidence,Created At\n']
    const rows = filteredItems.map(item =>
      `"${item.id}","${item.location_name || ''}",${item.latitude},${item.longitude},${item.sea_surface_temperature},"${item.label}",${item.probability},${item.confidence},"${item.created_at}"`
    )
    const blob = new Blob([headers.concat(rows.join('\n')).join('')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ecoral_predictions_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('CSV Dataset exported successfully.', 'success')
  }

  return (
    <div className="p-6 space-y-6 max-w-[1800px] mx-auto text-[#F5FAFC]">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#24475F]/60 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F5FAFC] flex items-center gap-2">
            <History className="w-6 h-6 text-[#18C8FF]" />
            Prediction Audit Trail & Telemetry Timeline
          </h1>
          <p className="text-xs text-[#8FA6B8] mt-1">
            Searchable historical observation log, risk timeline, GIS map layer, and CSV/PDF export manager.
          </p>
        </div>

        {/* Export Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] text-xs font-semibold hover:border-[#18C8FF] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4 text-[#5EEAD4]" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Mini Trend Chart & Metrics Strip */}
      {trendData.length > 0 && (
        <div className="p-5 rounded-xl border border-[#24475F] bg-[#0C1C2A] grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#8FA6B8] uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-[#18C8FF]" /> Historical Vulnerability Trend
              </span>
              <span className="text-[11px] text-[#8FA6B8]">Last 20 Observations</span>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="probGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#18C8FF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#18C8FF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#8FA6B8' }} tickLine={false} axisLine={{ stroke: '#24475F' }} />
                <YAxis tick={{ fontSize: 9, fill: '#8FA6B8' }} tickLine={false} axisLine={{ stroke: '#24475F' }} />
                <Tooltip contentStyle={{ background: '#122535', borderColor: '#24475F', borderRadius: '8px', fontSize: '11px' }} />
                <Area type="monotone" dataKey="probability" name="Bleaching Prob %" stroke="#18C8FF" fill="url(#probGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-[#24475F] pt-4 lg:pt-0 lg:pl-6 space-y-2">
            <div>
              <span className="text-[10px] font-bold text-[#8FA6B8] uppercase tracking-wider block">Total Logged Telemetry</span>
              <span className="font-display text-2xl font-bold text-[#F5FAFC]">{data?.total ?? 0}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#8FA6B8] uppercase tracking-wider block">Active Filter Count</span>
              <span className="font-display text-lg font-bold text-[#18C8FF]">{filteredItems.length} records</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-[#24475F] bg-[#0C1C2A]">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8FA6B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by location, lat/lng, or risk level..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] placeholder:text-[#8FA6B8]/50 focus:outline-none focus:border-[#18C8FF] text-xs transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA6B8] hover:text-[#F5FAFC]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Risk Filter Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#8FA6B8] uppercase tracking-wider mr-1">Risk:</span>
          {(['all', 'high', 'low'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRiskFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                riskFilter === r
                  ? 'bg-[#18C8FF] text-[#07131E] shadow-sm'
                  : 'bg-[#122535] text-[#8FA6B8] hover:text-[#F5FAFC] border border-[#24475F]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#122535] border border-[#24475F]">
          {[
            { id: 'timeline', label: 'Timeline', icon: Clock },
            { id: 'table', label: 'Table', icon: List },
            { id: 'map', label: 'GIS Map', icon: MapIcon },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#18C8FF]/15 text-[#18C8FF] border border-[#18C8FF]/30'
                  : 'text-[#8FA6B8] hover:text-[#F5FAFC]'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <div className="w-8 h-8 border-2 border-[#18C8FF]/30 border-t-[#18C8FF] rounded-full animate-spin" />
          <span className="text-xs text-[#8FA6B8] font-medium">Loading prediction audit trail...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-[#24475F] bg-[#0C1C2A]">
          <Database className="w-10 h-10 text-[#8FA6B8]/40 mb-3" />
          <p className="text-sm font-bold text-[#F5FAFC]">No Matching Telemetry Records</p>
          <p className="text-xs text-[#8FA6B8] mt-1">Try resetting your search query or risk filters.</p>
        </div>
      ) : (
        <>
          {/* TAB 1: TIMELINE VIEW */}
          {activeTab === 'timeline' && (
            <div className="relative border-l-2 border-[#24475F] ml-4 pl-6 space-y-6">
              {filteredItems.map((item, i) => {
                const isDeletingThis = deletingId === item.id

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="relative group"
                  >
                    {/* Timeline Node */}
                    <span
                      className="absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full border-2 border-[#07131E] transition-transform group-hover:scale-125"
                      style={{ background: item.prediction === 1 ? '#FF5A6E' : '#27D980' }}
                    />

                    <div className="p-5 rounded-xl border border-[#24475F] bg-[#0C1C2A] card-hover-elevation space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#24475F]/60 pb-3">
                        <div className="flex items-center gap-3">
                          <RiskBadge prediction={item.prediction as 0|1} />
                          <span className="text-sm font-bold text-[#F5FAFC]">
                            {item.location_name || 'Ocean Telemetry Observation'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#8FA6B8]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(item.created_at).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-[#122535] border border-[#24475F]/60">
                          <span className="text-[10px] font-bold text-[#8FA6B8] uppercase block">Coordinates</span>
                          <span className="font-mono text-[#F5FAFC]">{item.latitude.toFixed(4)}°, {item.longitude.toFixed(4)}°</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#122535] border border-[#24475F]/60">
                          <span className="text-[10px] font-bold text-[#8FA6B8] uppercase block">Sea Surface Temp</span>
                          <span className="font-bold text-[#18C8FF]">{item.sea_surface_temperature.toFixed(1)} °C</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#122535] border border-[#24475F]/60">
                          <span className="text-[10px] font-bold text-[#8FA6B8] uppercase block">Probability</span>
                          <span className="font-bold text-[#F5FAFC]">{(item.probability * 100).toFixed(1)}%</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#122535] border border-[#24475F]/60">
                          <span className="text-[10px] font-bold text-[#8FA6B8] uppercase block">Confidence</span>
                          <span className="font-bold text-[#5EEAD4]">{(item.confidence * 100).toFixed(1)}%</span>
                        </div>
                      </div>

                      {item.explanation && (
                        <div className="p-3 rounded-lg bg-[#122535]/80 border border-[#24475F] text-xs text-[#8FA6B8] leading-relaxed">
                          <strong className="text-[#18C8FF] block mb-0.5">SHAP AI Explanation Summary:</strong>
                          {item.explanation.replace(/\*\*/g, '').slice(0, 160)}...
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#24475F]/40">
                        <button
                          onClick={() => handleSelectForCompare(item)}
                          className={`text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            compareItems[0]?.id === item.id
                              ? 'text-[#18C8FF] font-bold'
                              : 'text-[#8FA6B8] hover:text-[#F5FAFC]'
                          }`}
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          {compareItems[0]?.id === item.id ? 'Selected for Compare' : 'Compare Observation'}
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => generateReportMutation.mutate(item.id)}
                            disabled={generateReportMutation.isPending}
                            className="px-3 py-1.5 rounded-lg bg-[#18C8FF]/10 text-[#18C8FF] border border-[#18C8FF]/30 text-xs font-semibold hover:bg-[#18C8FF]/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <FileText className="w-3.5 h-3.5" /> Generate PDF Report
                          </button>

                          <button
                            onClick={() => handleDeletePrediction(item)}
                            disabled={isDeletingThis}
                            className="px-3 py-1.5 rounded-lg bg-[#FF5A6E]/10 text-[#FF5A6E] border border-[#FF5A6E]/30 text-xs font-semibold hover:bg-[#FF5A6E]/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isDeletingThis ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* TAB 2: TABLE VIEW */}
          {activeTab === 'table' && (
            <div className="rounded-xl border border-[#24475F] bg-[#0C1C2A] overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#24475F] bg-[#122535]">
                      {['Timestamp', 'Location / Coordinates', 'SST (°C)', 'Risk Level', 'Probability', 'Confidence', 'Actions'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-xs font-bold text-[#8FA6B8] uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#24475F]/60">
                    {filteredItems.map((item) => {
                      const isDeletingThis = deletingId === item.id

                      return (
                        <tr key={item.id} className="hover:bg-[#122535]/60 transition-colors">
                          <td className="px-5 py-3.5 text-xs text-[#8FA6B8]">{new Date(item.created_at).toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-xs font-mono text-[#F5FAFC] font-semibold">
                            {item.location_name || `${item.latitude.toFixed(4)}°, ${item.longitude.toFixed(4)}°`}
                          </td>
                          <td className="px-5 py-3.5 text-xs font-bold text-[#18C8FF]">{item.sea_surface_temperature.toFixed(1)} °C</td>
                          <td className="px-5 py-3.5"><RiskBadge prediction={item.prediction as 0|1} /></td>
                          <td className="px-5 py-3.5 text-xs font-semibold text-[#F5FAFC]">{(item.probability * 100).toFixed(1)}%</td>
                          <td className="px-5 py-3.5 text-xs font-semibold text-[#5EEAD4]">{(item.confidence * 100).toFixed(1)}%</td>
                          <td className="px-5 py-3.5 text-xs">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => generateReportMutation.mutate(item.id)}
                                className="text-[#18C8FF] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" /> PDF
                              </button>
                              <button
                                onClick={() => handleDeletePrediction(item)}
                                disabled={isDeletingThis}
                                className="text-[#FF5A6E] font-semibold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: GIS MAP VIEW */}
          {activeTab === 'map' && (
            <div className="h-[500px] rounded-xl border border-[#24475F] overflow-hidden">
              <EcoMap
                onMapClick={() => {}}
                prediction={null}
                selectedCoords={filteredItems[0] ? { lat: filteredItems[0].latitude, lng: filteredItems[0].longitude } : null}
              />
            </div>
          )}
        </>
      )}

      {/* Comparison Modal */}
      <AnimatePresence>
        {showCompareModal && compareItems[0] && compareItems[1] && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07131E]/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl rounded-xl border border-[#24475F] bg-[#0C1C2A] p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-[#24475F] pb-4">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-[#18C8FF]" />
                  <h3 className="font-display font-bold text-[#F5FAFC] text-base">Prediction Comparison Matrix</h3>
                </div>
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="p-1 rounded-lg text-[#8FA6B8] hover:text-[#F5FAFC] hover:bg-[#122535] transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[compareItems[0], compareItems[1]].map((item, idx) => (
                  <div key={item.id} className="p-4 rounded-xl border border-[#24475F] bg-[#122535] space-y-3">
                    <span className="text-[10px] font-bold text-[#8FA6B8] uppercase tracking-wider block">Observation {idx + 1}</span>
                    <p className="text-xs font-bold text-[#F5FAFC] truncate">{item.location_name || 'Observation'}</p>
                    <div className="text-xs font-mono text-[#8FA6B8]">
                      {item.latitude}°, {item.longitude}° · <span className="text-[#18C8FF]">{item.sea_surface_temperature}°C</span>
                    </div>
                    <RiskBadge prediction={item.prediction as 0|1} />
                    <div className="text-xs text-[#8FA6B8] pt-2 border-t border-[#24475F]/60">
                      Probability: <strong className="text-[#F5FAFC]">{(item.probability * 100).toFixed(1)}%</strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* Delta breakdown */}
              <div className="p-3 rounded-lg bg-[#07131E] border border-[#24475F] text-xs text-[#8FA6B8] flex items-center justify-between">
                <span>Thermal Delta: <strong className="text-[#18C8FF]">{(compareItems[1].sea_surface_temperature - compareItems[0].sea_surface_temperature).toFixed(1)}°C</strong></span>
                <span>Probability Delta: <strong className={compareItems[1].probability >= compareItems[0].probability ? 'text-[#FF5A6E]' : 'text-[#27D980]'}>
                  {compareItems[1].probability >= compareItems[0].probability ? '+' : ''}{((compareItems[1].probability - compareItems[0].probability) * 100).toFixed(1)}%
                </strong></span>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowCompareModal(false)}
                  className="px-5 py-2 rounded-lg bg-[#18C8FF] text-[#07131E] font-bold text-xs hover:opacity-90 transition-all cursor-pointer"
                >
                  Close Comparison
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
