import axios from 'axios'

let rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
if (typeof window !== 'undefined' && rawBase.includes('localhost')) {
  rawBase = rawBase.replace('localhost', '127.0.0.1')
}

export const api = axios.create({
  baseURL: `${rawBase}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// Attach JWT token from localStorage & log request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  console.log(`[EcoRal API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
  return config
})

// Handle 401 globally & log response
api.interceptors.response.use(
  (res) => {
    console.log(`[EcoRal API Success] ${res.status} ${res.config.url}`)
    return res
  },
  async (error) => {
    const status = error.response?.status
    if (status && status >= 400 && status < 500) {
      console.warn(`[EcoRal API Warning] ${error.config?.url}: ${status} ${error.message}`)
    } else {
      console.error(`[EcoRal API Error] ${error.config?.url}:`, error.message, status || 'No Response')
    }
    if (status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname
      if (path !== '/login' && path !== '/register' && path !== '/') {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  register: (data: { email: string; full_name: string; password: string }) =>
    api.post('/auth/register', data).then(r => r.data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
}

// Predictions API
export const predictApi = {
  predict: (data: { latitude: number; longitude: number; sea_surface_temperature: number; location_name?: string }) =>
    api.post('/predict', data).then(r => r.data),
  get: (id: string) => api.get(`/predict/${id}`).then(r => r.data),
}

// History API
export const historyApi = {
  list: (page = 1, pageSize = 20) =>
    api.get('/history', { params: { page, page_size: pageSize } }).then(r => r.data),
  delete: (id: string) => api.delete(`/history/${id}`),
}

// Analytics API
export const analyticsApi = {
  stats: () => api.get('/analytics/stats').then(r => r.data),
  trends: (days = 30) => api.get('/analytics/trends', { params: { days } }).then(r => r.data),
  model: () => api.get('/analytics/model-info').then(r => r.data),
  detailed: () => api.get('/analytics/detailed').then(r => r.data),
}

// Locations API
export const locationsApi = {
  list: () => api.get('/locations').then(r => r.data),
  create: (data: { name: string; latitude: number; longitude: number; description?: string }) =>
    api.post('/locations', data).then(r => r.data),
  delete: (id: string) => api.delete(`/locations/${id}`),
}

// Reports API with authenticated blob download
export const reportsApi = {
  generate: (data: { prediction_id: string; title?: string }) =>
    api.post('/reports/generate', data).then(r => r.data),
  list: () => api.get('/reports').then(r => r.data),
  delete: (id: string) => api.delete(`/reports/${id}`),
  downloadReport: async (id: string, title?: string) => {
    const response = await api.get(`/reports/${id}/download`, { responseType: 'blob' })
    const dataBlob = response.data as Blob

    // Check if the server returned JSON error masked inside a Blob
    if (dataBlob.type === 'application/json' || dataBlob.size < 50) {
      const text = await dataBlob.text()
      try {
        const json = JSON.parse(text)
        throw new Error(json.detail || 'Report is not ready yet')
      } catch (e: any) {
        if (e.message && !e.message.includes('JSON')) throw e
        throw new Error(`Invalid PDF file returned (${dataBlob.size} bytes)`)
      }
    }

    const pdfBlob = new Blob([dataBlob], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(pdfBlob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${title || 'EcoRal_Report'}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => window.URL.revokeObjectURL(url), 1000)
  },
}

// Environmental Telemetry API
export const environmentalApi = {
  getTelemetry: (latitude: number, longitude: number) =>
    api.get('/environmental/telemetry', { params: { latitude, longitude } }).then(r => r.data),
}

// AI Assistant API
export const assistantApi = {
  chat: (data: { message: string; conversation_history?: Array<{ role: string; content: string }>; context?: Record<string, any> }) =>
    api.post('/assistant/chat', data).then(r => r.data),
}

// Global Ocean Risk Engine API
export const gridApi = {
  predictRegion: (data: {
    region_name: string
    min_latitude: number
    max_latitude: number
    min_longitude: number
    max_longitude: number
    grid_resolution?: number
    default_sst?: number
  }) => api.post('/grid/predict-region', data).then(r => r.data),
}

// Global Background Intelligence Engine API
export const intelligenceApi = {
  getSummary: () => api.get('/intelligence/global-summary').then(r => r.data),
  getStatus: () => api.get('/intelligence/status').then(r => r.data),
  triggerScan: () => api.post('/intelligence/trigger-scan').then(r => r.data),
}

// Coral Bleaching Forecasting Engine API
export const forecastingApi = {
  predictForecast: (data: { latitude: number; longitude: number; sea_surface_temperature: number; horizon?: string }) =>
    api.post('/forecasting/predict-forecast', data).then(r => r.data),
}

// Research Workspace API with authenticated CSV export
export const workspaceApi = {
  listProjects: () => api.get('/workspace/projects').then(r => r.data),
  createProject: (data: { title: string; description?: string; tags?: string; is_collaborative?: boolean }) =>
    api.post('/workspace/projects', data).then(r => r.data),
  deleteProject: (id: string) => api.delete(`/workspace/projects/${id}`),
  deleteExperiment: (projectId: string, experimentId: string) =>
    api.delete(`/workspace/projects/${projectId}/experiments/${experimentId}`),
  getProject: (id: string) => api.get(`/workspace/projects/${id}`).then(r => r.data),
  addNote: (id: string, data: { content: string }) => api.post(`/workspace/projects/${id}/notes`, data).then(r => r.data),
  addExperiment: (id: string, data: any) => api.post(`/workspace/projects/${id}/experiments`, data).then(r => r.data),
  exportProjectCSV: async (id: string, projectTitle?: string) => {
    const response = await api.get(`/workspace/projects/${id}/export-dataset`, { responseType: 'blob' })
    const blob = new Blob([response.data], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${projectTitle ? projectTitle.replace(/[^a-zA-Z0-9]/g, '_') : 'ecoral_project'}_dataset.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}
