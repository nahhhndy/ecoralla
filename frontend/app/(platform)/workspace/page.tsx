'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderKanban,
  Plus,
  FileText,
  Download,
  Users,
  MessageSquare,
  FlaskConical,
  X,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Info,
  Loader,
  Database,
  Trash2
} from 'lucide-react'
import { workspaceApi, predictApi } from '@/lib/api'
import { useToast } from '@/lib/providers'

export interface ResearchProjectData {
  id: string
  title: string
  description?: string
  tags?: string
  is_collaborative: boolean
  created_at: string
  notes: Array<{ id: string; author_name: string; content: string; created_at: string }>
  experiments: Array<{
    id: string
    title: string
    latitude: number
    longitude: number
    sea_surface_temperature: number
    prediction: number
    probability: number
    confidence: number
    notes?: string
    created_at: string
  }>
}

interface CSVValidationResult {
  totalRows: number
  validRows: Array<{ latitude: number; longitude: number; sea_surface_temperature: number; location_name: string }>
  invalidRows: number
  warnings: string[]
}

export function getRiskCategory(prob: number): { label: string; color: string; bg: string } {
  if (prob >= 0.85) return { label: 'CRITICAL', color: '#E11D48', bg: 'rgba(225,29,72,0.15)' }
  if (prob >= 0.50) return { label: 'HIGH', color: '#FF5A6E', bg: 'rgba(255,90,110,0.15)' }
  if (prob >= 0.35) return { label: 'MODERATE', color: '#FFB547', bg: 'rgba(255,181,71,0.15)' }
  return { label: 'LOW', color: '#27D980', bg: 'rgba(39,217,128,0.15)' }
}

export default function ResearchWorkspacePage() {
  const qc = useQueryClient()
  const { showToast, confirm } = useToast()
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [showImportModal, setShowImportModal] = useState<boolean>(false)
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingExpId, setDeletingExpId] = useState<string | null>(null)

  // Create Project Form
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newTags, setNewTags] = useState('coral-bleaching, sst-telemetry')

  // Add Note Form
  const [newNoteContent, setNewNoteContent] = useState('')

  // CSV Import State
  const [rawCsvText, setRawCsvText] = useState('')
  const [importSummary, setImportSummary] = useState<CSVValidationResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const { data: projects = [], isLoading } = useQuery<ResearchProjectData[]>({
    queryKey: ['workspace-projects'],
    queryFn: workspaceApi.listProjects,
  })

  const createMutation = useMutation({
    mutationFn: workspaceApi.createProject,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['workspace-projects'] })
      setSelectedProjectId(data.id)
      setShowCreateModal(false)
      setNewTitle('')
      setNewDesc('')
      showToast(`Research Project "${data.title}" created successfully.`, 'success')
    },
    onError: (e: any) => {
      showToast(e?.response?.data?.detail || 'Failed to create project.', 'error')
    },
  })

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => workspaceApi.deleteProject(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-projects'] })
      setSelectedProjectId(null)
      showToast('Research project deleted successfully.', 'success')
    },
    onError: (e: any) => {
      showToast(e?.response?.data?.detail || 'Failed to delete research project.', 'error')
    },
    onSettled: () => {
      setDeletingId(null)
    },
  })

  const deleteExperimentMutation = useMutation({
    mutationFn: ({ projectId, experimentId }: { projectId: string; experimentId: string }) =>
      workspaceApi.deleteExperiment(projectId, experimentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-projects'] })
      qc.invalidateQueries({ queryKey: ['history'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['trends'] })
      qc.invalidateQueries({ queryKey: ['analytics-detailed'] })
      showToast('Observation deleted successfully.', 'success')
    },
    onError: (e: any) => {
      showToast(e?.response?.data?.detail || 'Unable to delete observation. Please try again.', 'error')
    },
    onSettled: () => {
      setDeletingExpId(null)
    },
  })

  const addNoteMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      workspaceApi.addNote(id, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-projects'] })
      setNewNoteContent('')
      showToast('Research note added.', 'success')
    },
    onError: (e: any) => {
      showToast(e?.response?.data?.detail || 'Failed to add note.', 'error')
    },
  })

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0]

  const handleDeleteProject = async (project: ResearchProjectData) => {
    const confirmed = await confirm({
      title: 'Delete Research Project?',
      message: `Delete "${project.title}" along with all associated experiment records and research notes? This action cannot be undone.`,
      confirmText: 'Delete Project',
      isDestructive: true,
    })

    if (confirmed) {
      setDeletingId(project.id)
      deleteProjectMutation.mutate(project.id)
    }
  }

  const handleDeleteExperiment = async (exp: any) => {
    if (!selectedProject) return
    const confirmed = await confirm({
      title: 'Delete Observation?',
      message: 'This will permanently remove this observation from the research workspace and prediction history.',
      confirmText: 'Delete Observation',
      isDestructive: true,
    })

    if (confirmed) {
      console.log('[Workspace Delete]', { projectId: selectedProject.id, experimentId: exp.id })
      setDeletingExpId(exp.id)
      deleteExperimentMutation.mutate({ projectId: selectedProject.id, experimentId: exp.id })
    }
  }

  // CSV Parse & Validate Helper
  const handleParseCSV = (csvContent: string) => {
    const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length === 0) {
      setImportSummary({ totalRows: 0, validRows: [], invalidRows: 0, warnings: ['CSV file is empty.'] })
      return
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
    const latIdx = headers.findIndex(h => h.includes('lat'))
    const lngIdx = headers.findIndex(h => h.includes('lng') || h.includes('lon'))
    const sstIdx = headers.findIndex(h => h.includes('sst') || h.includes('temp'))
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('loc'))

    const validRows: Array<{ latitude: number; longitude: number; sea_surface_temperature: number; location_name: string }> = []
    let invalidRows = 0
    const warnings: string[] = []

    if (latIdx === -1 || lngIdx === -1 || sstIdx === -1) {
      warnings.push('Required header columns missing: latitude, longitude, sea_surface_temperature.')
    }

    const dataLines = latIdx !== -1 && lngIdx !== -1 ? lines.slice(1) : lines

    dataLines.forEach((line, index) => {
      const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''))
      if (parts.length < 3) {
        invalidRows++
        return
      }

      const lat = parseFloat(parts[latIdx !== -1 ? latIdx : 0])
      const lng = parseFloat(parts[lngIdx !== -1 ? lngIdx : 1])
      const sst = parseFloat(parts[sstIdx !== -1 ? sstIdx : 2])
      const name = nameIdx !== -1 && parts[nameIdx] ? parts[nameIdx] : `Imported Point ${index + 1}`

      if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180 || isNaN(sst) || sst < -2 || sst > 40) {
        invalidRows++
      } else {
        validRows.push({ latitude: lat, longitude: lng, sea_surface_temperature: sst, location_name: name })
      }
    })

    setImportSummary({
      totalRows: dataLines.length,
      validRows,
      invalidRows,
      warnings,
    })
  }

  // Execute Import
  const handleExecuteImport = async () => {
    if (!selectedProject || !importSummary || importSummary.validRows.length === 0) return

    setIsImporting(true)
    try {
      for (const row of importSummary.validRows) {
        const pred = await predictApi.predict({
          latitude: row.latitude,
          longitude: row.longitude,
          sea_surface_temperature: row.sea_surface_temperature,
          location_name: row.location_name,
        })

        await workspaceApi.addExperiment(selectedProject.id, {
          title: row.location_name,
          latitude: row.latitude,
          longitude: row.longitude,
          sea_surface_temperature: row.sea_surface_temperature,
          prediction: pred.prediction,
          probability: pred.probability,
          confidence: pred.confidence,
          notes: `Imported observation telemetry (${row.sea_surface_temperature}°C)`,
        })
      }

      qc.invalidateQueries({ queryKey: ['workspace-projects'] })
      setShowImportModal(false)
      setRawCsvText('')
      setImportSummary(null)
      showToast(`Successfully imported ${importSummary.validRows.length} environmental observation records.`, 'success')
    } catch (e: any) {
      showToast(`Import warning: ${e?.message || 'Some rows failed processing.'}`, 'error')
    } finally {
      setIsImporting(false)
    }
  }

  // Handle Authenticated Export
  const handleExportCSV = async (projectId: string, title?: string) => {
    try {
      setIsExporting(true)
      await workspaceApi.exportProjectCSV(projectId, title)
      showToast('CSV dataset exported successfully.', 'success')
    } catch (e: any) {
      showToast(`Export failed: ${e?.response?.data?.detail || 'Unable to download dataset.'}`, 'error')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1800px] mx-auto text-[#F5FAFC]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#24475F]/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-[#18C8FF]" />
            <h1 className="font-display text-2xl font-extrabold text-[#F5FAFC]">EcoRal Research Workspace</h1>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#18C8FF]/15 text-[#18C8FF] border border-[#18C8FF]/30">
              Advanced Research Layer
            </span>
          </div>
          <p className="text-xs text-[#8FA6B8] mt-1">Organize environmental investigations, import telemetry datasets, track experiments, and export research records</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#18C8FF] to-[#5EEAD4] text-[#07131E] font-bold text-xs hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-[#18C8FF]/15"
          >
            <Plus className="w-4 h-4" /> New Research Project
          </button>
        </div>
      </div>

      {/* Main Workspace Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Projects List */}
        <div className="p-5 rounded-xl border border-[#24475F] bg-[#0C1C2A] shadow-2xl space-y-4">
          <h2 className="font-display font-bold text-[#F5FAFC] text-sm flex items-center gap-2 border-b border-[#24475F]/60 pb-3">
            <FolderKanban className="w-4 h-4 text-[#18C8FF]" /> Saved Research Projects ({projects.length})
          </h2>

          {isLoading ? (
            <div className="py-12 text-center text-[#8FA6B8]">
              <div className="w-6 h-6 border-2 border-[#18C8FF]/20 border-t-[#18C8FF] rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs">Loading Workspace Projects...</span>
            </div>
          ) : projects.length > 0 ? (
            <div className="space-y-3">
              {projects.map((p) => {
                const isSelected = selectedProject?.id === p.id
                return (
                  <motion.div
                    key={p.id}
                    whileHover={{ x: 2 }}
                    onClick={() => setSelectedProjectId(p.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2.5 ${
                      isSelected
                        ? 'border-[#18C8FF] bg-[#122535] shadow-lg shadow-[#18C8FF]/10'
                        : 'border-[#24475F] bg-[#07131E]/60 hover:bg-[#122535]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#F5FAFC] truncate">{p.title}</span>
                      {p.is_collaborative && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#5EEAD4]/15 text-[#5EEAD4] border border-[#5EEAD4]/30 flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" /> Shared
                        </span>
                      )}
                    </div>

                    {p.description && <p className="text-[11px] text-[#8FA6B8] line-clamp-2">{p.description}</p>}

                    <div className="flex items-center justify-between text-[10px] text-[#8FA6B8] pt-2 border-t border-[#24475F]/40 font-mono">
                      <span>{p.experiments?.length || 0} Experiments</span>
                      <span>{p.notes?.length || 0} Notes</span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-[#8FA6B8] border border-dashed border-[#24475F] rounded-xl p-4">
              <FolderKanban className="w-8 h-8 text-[#8FA6B8]/40 mx-auto mb-2" />
              <p className="text-xs font-bold text-[#F5FAFC]">No Research Projects Yet</p>
              <p className="text-[11px] text-[#8FA6B8] mt-1 mb-4">Organize your environmental investigations around a research project.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-lg bg-[#18C8FF] text-[#07131E] font-bold text-xs hover:opacity-90 transition-all cursor-pointer"
              >
                Create Research Project
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Selected Project Detail View */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-[#24475F] bg-[#0C1C2A] shadow-2xl space-y-6">
          {selectedProject ? (
            <div className="space-y-6">
              {/* Project Header Bar & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#24475F]/60 pb-4">
                <div>
                  <h2 className="font-display font-extrabold text-lg text-[#F5FAFC]">{selectedProject.title}</h2>
                  <p className="text-xs text-[#8FA6B8] mt-0.5">{selectedProject.description || 'EcoRal environmental investigation project.'}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-3.5 py-2 rounded-lg bg-[#122535] border border-[#24475F] text-[#18C8FF] font-bold text-xs hover:border-[#18C8FF] transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" /> Import Data (CSV)
                  </button>

                  <button
                    onClick={() => handleExportCSV(selectedProject.id, selectedProject.title)}
                    disabled={isExporting}
                    className="px-3.5 py-2 rounded-lg bg-[#122535] border border-[#24475F] text-[#5EEAD4] font-bold text-xs hover:border-[#5EEAD4] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isExporting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>{isExporting ? 'Exporting...' : 'Export Dataset'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteProject(selectedProject)}
                    disabled={deletingId === selectedProject.id}
                    className="px-3.5 py-2 rounded-lg bg-[#FF5A6E]/10 border border-[#FF5A6E]/30 text-[#FF5A6E] font-bold text-xs hover:bg-[#FF5A6E]/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === selectedProject.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>{deletingId === selectedProject.id ? 'Deleting...' : 'Delete Project'}</span>
                  </button>
                </div>
              </div>

              {/* SECTION: Compare Experiments Table */}
              <div className="space-y-3">
                <h3 className="font-display font-bold text-[#F5FAFC] text-xs uppercase tracking-wider flex items-center gap-2 text-[#18C8FF]">
                  <FlaskConical className="w-4 h-4" /> Experiment Records & Comparisons ({selectedProject.experiments?.length || 0})
                </h3>

                {selectedProject.experiments && selectedProject.experiments.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-[#24475F] bg-[#122535]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#07131E] text-[#8FA6B8] uppercase text-[10px] tracking-wider border-b border-[#24475F]">
                        <tr>
                          <th className="p-3">Observation Title</th>
                          <th className="p-3">Coordinates</th>
                          <th className="p-3">SST (°C)</th>
                          <th className="p-3">Risk Category</th>
                          <th className="p-3">Probability</th>
                          <th className="p-3">Confidence</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#24475F]/60 text-[#F5FAFC]">
                        {selectedProject.experiments.map((exp) => {
                          const cat = getRiskCategory(exp.probability)
                          const isDeletingThis = deletingExpId === exp.id

                          return (
                            <tr key={exp.id} className="hover:bg-[#07131E]/40 transition-colors">
                              <td className="p-3 font-bold">{exp.title}</td>
                              <td className="p-3 font-mono text-[#8FA6B8]">{exp.latitude}°, {exp.longitude}°</td>
                              <td className="p-3 font-mono text-[#18C8FF] font-bold">{exp.sea_surface_temperature}°C</td>
                              <td className="p-3">
                                <span
                                  className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase"
                                  style={{ color: cat.color, backgroundColor: cat.bg, border: `1px solid ${cat.color}40` }}
                                >
                                  {cat.label}
                                </span>
                              </td>
                              <td className="p-3 font-mono font-bold">{(exp.probability * 100).toFixed(1)}%</td>
                              <td className="p-3 font-mono text-[#5EEAD4]">{(exp.confidence * 100).toFixed(1)}%</td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleDeleteExperiment(exp)}
                                  disabled={isDeletingThis}
                                  className="px-2.5 py-1 rounded border border-[#FF5A6E]/30 bg-[#FF5A6E]/10 text-[#FF5A6E] text-[11px] font-semibold hover:bg-[#FF5A6E]/20 transition-all inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  {isDeletingThis ? (
                                    <Loader className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                  <span>{isDeletingThis ? 'Deleting...' : 'Delete'}</span>
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 rounded-xl border border-dashed border-[#24475F] bg-[#07131E]/40 text-center text-xs text-[#8FA6B8] space-y-2">
                    <Database className="w-8 h-8 text-[#8FA6B8]/40 mx-auto" />
                    <p className="font-bold text-[#F5FAFC]">No Experiment Records Yet</p>
                    <p className="text-[11px] max-w-sm mx-auto">Run risk predictions from the Ocean Map or click "Import Data (CSV)" to add telemetry records.</p>
                  </div>
                )}
              </div>

              {/* SECTION: Collaborative Research Notes */}
              <div className="space-y-3 border-t border-[#24475F]/60 pt-5">
                <h3 className="font-display font-bold text-[#F5FAFC] text-xs uppercase tracking-wider flex items-center gap-2 text-[#5EEAD4]">
                  <MessageSquare className="w-4 h-4" /> Collaborative Research Notebook ({selectedProject.notes?.length || 0})
                </h3>

                {/* Add Note Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (newNoteContent.trim() && selectedProject) {
                      addNoteMutation.mutate({ id: selectedProject.id, content: newNoteContent })
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Add research note, field observation, or ecological hypothesis..."
                    className="flex-1 px-3.5 py-2.5 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] placeholder:text-[#8FA6B8]/50 focus:outline-none focus:border-[#18C8FF] text-xs transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!newNoteContent.trim() || addNoteMutation.isPending}
                    className="px-4 py-2.5 rounded-lg bg-[#18C8FF] text-[#07131E] font-bold text-xs hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer shrink-0"
                  >
                    Post Note
                  </button>
                </form>

                {/* Notes Feed */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {selectedProject.notes?.map((n) => (
                    <div key={n.id} className="p-3 rounded-lg border border-[#24475F] bg-[#122535] space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-[#8FA6B8] border-b border-[#24475F]/40 pb-1">
                        <span className="font-bold text-[#5EEAD4]">{n.author_name}</span>
                        <span className="font-mono">{new Date(n.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[#F5FAFC] leading-relaxed pt-1">{n.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-[#8FA6B8]">
              <FolderKanban className="w-12 h-12 text-[#18C8FF]/30 mx-auto mb-3 animate-pulse" />
              <h3 className="font-display font-bold text-[#F5FAFC] text-base mb-1">Select a Research Project</h3>
              <p className="text-xs max-w-sm mx-auto">Choose a project from the left sidebar to view experiments, compare telemetry logs, and export datasets.</p>
            </div>
          )}
        </div>
      </div>

      {/* CSV DATA IMPORT MODAL */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07131E]/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl rounded-xl border border-[#24475F] bg-[#0C1C2A] p-6 shadow-2xl space-y-5 text-[#F5FAFC]"
            >
              <div className="flex items-center justify-between border-b border-[#24475F] pb-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#18C8FF]" />
                  <h3 className="font-display font-bold text-[#F5FAFC] text-base">Import Environmental Data (CSV)</h3>
                </div>
                <button onClick={() => { setShowImportModal(false); setImportSummary(null); }} className="text-[#8FA6B8] hover:text-[#F5FAFC]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <p className="text-[#8FA6B8]">
                  Paste or upload CSV text containing header columns: <code className="text-[#18C8FF] bg-[#122535] px-1.5 py-0.5 rounded font-mono">latitude</code>, <code className="text-[#18C8FF] bg-[#122535] px-1.5 py-0.5 rounded font-mono">longitude</code>, <code className="text-[#18C8FF] bg-[#122535] px-1.5 py-0.5 rounded font-mono">sea_surface_temperature</code>, <code className="text-[#18C8FF] bg-[#122535] px-1.5 py-0.5 rounded font-mono">location_name</code>.
                </p>

                <textarea
                  value={rawCsvText}
                  onChange={(e) => {
                    setRawCsvText(e.target.value)
                    handleParseCSV(e.target.value)
                  }}
                  placeholder={`latitude,longitude,sea_surface_temperature,location_name\n16.50,-120.20,29.4,South China Sea Reef\n-18.28,147.70,29.8,Great Barrier Reef`}
                  className="w-full h-36 px-3.5 py-2.5 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] font-mono text-xs focus:outline-none focus:border-[#18C8FF]"
                />

                {/* Import Row Validation Summary */}
                {importSummary && (
                  <div className="p-3.5 rounded-xl border border-[#24475F] bg-[#122535] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold border-b border-[#24475F]/60 pb-2">
                      <span>Import Validation Summary</span>
                      <span className="text-[#18C8FF]">{importSummary.totalRows} Rows Detected</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-[#07131E] border border-[#27D980]/30 text-[#27D980] flex items-center justify-between font-bold">
                        <span>Valid Rows:</span>
                        <span>{importSummary.validRows.length}</span>
                      </div>
                      <div className="p-2 rounded bg-[#07131E] border border-[#FF5A6E]/30 text-[#FF5A6E] flex items-center justify-between font-bold">
                        <span>Invalid / Errors:</span>
                        <span>{importSummary.invalidRows}</span>
                      </div>
                    </div>

                    {importSummary.warnings.map((w, idx) => (
                      <div key={idx} className="text-[11px] text-[#FFB547] flex items-center gap-1.5 mt-1 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#24475F]">
                <button
                  onClick={() => { setShowImportModal(false); setImportSummary(null); }}
                  className="px-4 py-2 rounded-lg bg-[#122535] text-[#8FA6B8] text-xs font-bold hover:text-[#F5FAFC]"
                >
                  Cancel
                </button>

                <button
                  onClick={handleExecuteImport}
                  disabled={!importSummary || importSummary.validRows.length === 0 || isImporting}
                  className="px-5 py-2 rounded-lg bg-[#18C8FF] text-[#07131E] font-bold text-xs hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing Predictions...</span>
                    </>
                  ) : (
                    <span>Import {importSummary?.validRows.length || 0} Valid Records</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE PROJECT MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07131E]/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-xl border border-[#24475F] bg-[#0C1C2A] p-6 shadow-2xl space-y-5 text-[#F5FAFC]"
            >
              <div className="flex items-center justify-between border-b border-[#24475F] pb-3">
                <h3 className="font-display font-bold text-[#F5FAFC] text-base">Create Research Project</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-[#8FA6B8] hover:text-[#F5FAFC]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#8FA6B8] font-bold mb-1">Project Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. EcoRal — El Niño Coral Risk Study"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] focus:outline-none focus:border-[#18C8FF]"
                  />
                </div>

                <div>
                  <label className="block text-[#8FA6B8] font-bold mb-1">Description</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Analyze coral bleaching risk under El Niño environmental conditions..."
                    className="w-full h-20 px-3.5 py-2 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] focus:outline-none focus:border-[#18C8FF]"
                  />
                </div>

                <div>
                  <label className="block text-[#8FA6B8] font-bold mb-1">Tags (Comma Separated)</label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#24475F] bg-[#122535] text-[#F5FAFC] focus:outline-none focus:border-[#18C8FF]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#24475F]">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#122535] text-[#8FA6B8] text-xs font-bold hover:text-[#F5FAFC]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (newTitle.trim()) {
                      createMutation.mutate({ title: newTitle, description: newDesc, tags: newTags, is_collaborative: true })
                    }
                  }}
                  disabled={!newTitle.trim() || createMutation.isPending}
                  className="px-5 py-2 rounded-lg bg-[#18C8FF] text-[#07131E] font-bold text-xs hover:opacity-90 disabled:opacity-40"
                >
                  Create Project
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
