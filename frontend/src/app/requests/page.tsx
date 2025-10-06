'use client'

import { useEffect, useState } from 'react'
import { Building2, Mail, Calendar, TrendingUp, Filter, Plus } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import { apiClient } from '@/lib/api'
import { MeetingRequest } from '@agenda-manager/shared'

export default function RequestsPage() {
  const [requests, setRequests] = useState<MeetingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  useEffect(() => {
    fetchRequests()
  }, [filter, page])
  
  async function fetchRequests() {
    setLoading(true)
    try {
      const params: any = { page, limit: 20, sortBy: 'submittedAt', sortOrder: 'desc' }
      if (filter !== 'all') {
        params.status = filter
      }
      
      console.log('Fetching requests with params:', params)
      const response = await apiClient.get('/requests', { params })
      console.log('API Response:', response.data)
      
      setRequests(response.data.data || [])
      setTotalPages(response.data.pagination?.totalPages || 1)
    } catch (error: any) {
      console.error('Failed to fetch requests:', error)
      console.error('Error details:', error.response?.data || error.message)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'qualified': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              Meeting Requests
            </h1>
            <p className="text-gray-400 mt-2">
              Manage and qualify meeting requests for the World Congress
            </p>
          </div>
          
          <button className="neumorphic-button text-primary-400 font-semibold">
            <span className="flex items-center gap-2">
              <Plus size={20} />
              New Request
            </span>
          </button>
        </div>
        
        {/* Filters */}
        <div className="neumorphic-card p-6">
          <div className="flex items-center gap-4">
            <Filter size={20} className="text-gray-400" />
            <div className="flex gap-2">
              {['all', 'pending', 'qualified', 'scheduled', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    filter === status
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Requests List */}
        <div className="space-y-4">
          {loading ? (
            // Loading skeleton
            [...Array(5)].map((_, i) => (
              <div key={i} className="neumorphic-card p-6 animate-pulse">
                <div className="h-20 bg-dark-700 rounded-xl" />
              </div>
            ))
          ) : requests.length === 0 ? (
            // Empty state
            <div className="neumorphic-card p-12 text-center">
              <Calendar className="mx-auto mb-4 text-gray-500" size={64} />
              <h3 className="text-xl font-semibold mb-2">No requests found</h3>
              <p className="text-gray-400 mb-4">
                {filter === 'all' 
                  ? 'Start the backend and import data to see requests'
                  : `No ${filter} requests at the moment`
                }
              </p>
              <button className="neumorphic-button text-primary-400">
                Import Sample Data
              </button>
            </div>
          ) : (
            // Request cards
            requests.map((request) => (
              <div
                key={request.id}
                className="neumorphic-card p-6 hover:scale-[1.01] transition-transform cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Building2 className="text-primary-400" size={24} />
                      <h3 className="text-xl font-semibold">{request.companyName}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                      {request.importanceScore && (
                        <span className="flex items-center gap-1 text-sm text-gray-400">
                          <TrendingUp size={16} />
                          {request.importanceScore}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-400 mb-4">
                      <div className="flex items-center gap-2">
                        <Mail size={16} />
                        {request.contactName} • {request.contactEmail}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        {new Date(request.submittedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs px-3 py-1 bg-dark-600 rounded-lg">
                        {request.meetingType}
                      </span>
                      <span className="text-xs px-3 py-1 bg-dark-600 rounded-lg">
                        {request.companyTier}
                      </span>
                      {request.requestedTopics.slice(0, 3).map((topic, idx) => (
                        <span key={idx} className="text-xs px-3 py-1 bg-dark-600 rounded-lg">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {request.status === 'pending' && (
                      <button className="neumorphic-button text-sm py-2 px-4 text-primary-400">
                        Qualify
                      </button>
                    )}
                    {request.status === 'qualified' && (
                      <button className="neumorphic-button text-sm py-2 px-4 text-green-400">
                        Schedule
                      </button>
                    )}
                    <button className="neumorphic-button text-sm py-2 px-4 text-gray-400">
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Pagination */}
        {!loading && requests.length > 0 && totalPages > 1 && (
          <div className="neumorphic-card p-4 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="neumorphic-button py-2 px-6 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="neumorphic-button py-2 px-6 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
