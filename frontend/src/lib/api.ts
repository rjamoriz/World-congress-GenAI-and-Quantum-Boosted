/**
 * API Client for backend communication
 */

import axios from 'axios'

// Use relative API path for production builds (proxied through Next.js API routes)
const API_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
  ? '' // Use relative path for production/tunnel access
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const apiClient = axios.create({
  baseURL: API_URL ? `${API_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// API helper functions
export const api = {
  // Requests
  getRequests: (params?: any) => apiClient.get('/requests', { params }),
  getRequest: (id: string) => apiClient.get(`/requests/${id}`),
  createRequest: (data: any) => apiClient.post('/requests', data),
  updateRequest: (id: string, data: any) => apiClient.put(`/requests/${id}`, data),
  deleteRequest: (id: string) => apiClient.delete(`/requests/${id}`),
  bulkCreateRequests: (data: any[]) => apiClient.post('/requests/bulk', data),
  
  // Hosts
  getHosts: (params?: any) => apiClient.get('/hosts', { params }),
  getHost: (id: string) => apiClient.get(`/hosts/${id}`),
  createHost: (data: any) => apiClient.post('/hosts', data),
  updateHost: (id: string, data: any) => apiClient.put(`/hosts/${id}`, data),
  deleteHost: (id: string) => apiClient.delete(`/hosts/${id}`),
  bulkCreateHosts: (data: any[]) => apiClient.post('/hosts/bulk', data),
  
  // Qualification
  qualifyRequest: (id: string) => apiClient.post(`/qualification/qualify/${id}`),
  qualifyBatch: (requestIds: string[]) => apiClient.post('/qualification/qualify-batch', { requestIds }),
  getQualificationStats: () => apiClient.get('/qualification/stats'),
  
  // Schedule
  optimizeSchedule: (data: any) => apiClient.post('/schedule/optimize', data),
  assignMeeting: (data: any) => apiClient.post('/schedule/assign', data),
  getSchedule: (params?: any) => apiClient.get('/schedule', { params }),
  getScheduledMeeting: (id: string) => apiClient.get(`/schedule/${id}`),
  updateScheduledMeeting: (id: string, data: any) => apiClient.put(`/schedule/${id}`, data),
  cancelMeeting: (id: string) => apiClient.delete(`/schedule/${id}`),
  
  // Workflow
  generateMaterials: (meetingId: string, options: any) => 
    apiClient.post(`/workflow/materials/${meetingId}`, options),
  sendFollowUp: (meetingId: string, data: any) => 
    apiClient.post(`/workflow/follow-up/${meetingId}`, data),
  exportSchedule: (filters: any) => 
    apiClient.post('/workflow/export', filters, { responseType: 'blob' }),
  getWorkflowStatus: (meetingId: string) => 
    apiClient.get(`/workflow/status/${meetingId}`),
  
  // Health
  getHealth: () => apiClient.get('/health'),
}
