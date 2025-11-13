'use client'

import { useEffect, useState } from 'react'
import { Building2, Mail, Calendar, TrendingUp, Filter, Plus } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import QuickActions from '@/components/QuickActions'
import BulkActions, { useBulkSelection } from '@/components/BulkActions'
import { SkeletonCard } from '@/components/Skeleton'
import PageTransition, { FadeIn } from '@/components/PageTransition'
import { apiClient } from '@/lib/api'
import { MeetingRequest, RequestStatus } from '@agenda-manager/shared'
import { useNotify } from '@/contexts/NotificationContext'

export default function RequestsPage() {
  const [requests, setRequests] = useState<MeetingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const notify = useNotify()
  const { selectedIds, isSelected, toggleSelection, clearSelection } = useBulkSelection(requests)
  
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

  const handleQuickAction = async (action: string, request: MeetingRequest) => {
    try {
      let endpoint = ''
      let method = 'POST'
      let body: any = {}

      switch (action) {
        case 'qualify':
          endpoint = `/api/qualification/qualify/${request.id}`
          break
        case 'reject':
          endpoint = `/api/requests/${request.id}`
          method = 'PUT'
          body = { status: RequestStatus.REJECTED, rejectionReason: 'AI Quick Reject' }
          break
        case 'auto-schedule':
          endpoint = `/api/schedule/optimize`
          body = { requestIds: [request.id] }
          break
        case 'assign-host':
          notify.info('Coming Soon', 'Host assignment UI will be added')
          return
        case 'generate-materials':
          notify.info('Coming Soon', 'Material generation will be added')
          return
        case 'send-confirmation':
          notify.info('Coming Soon', 'Email confirmation will be added')
          return
        case 'send-followup':
          notify.info('Coming Soon', 'Follow-up email will be added')
          return
        case 'view-details':
          notify.info('View Details', `Request ID: ${request.id}`)
          return
        default:
          return
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) throw new Error(`Action ${action} failed`)

      notify.success('Action Complete', `Successfully performed ${action}`)
      fetchRequests()
    } catch (error) {
      notify.error('Action Failed', `Could not perform ${action}`)
    }
  }

  const handleBulkAction = async (action: string, requestIds: string[]) => {
    try {
      let endpoint = ''
      let method = 'POST'
      let body: any = {}

      switch (action) {
        case 'qualify':
          // Qualify each request
          await Promise.all(
            requestIds.map(id => 
              fetch(`/api/qualification/${id}/qualify`, { method: 'POST' })
            )
          )
          break
        case 'reject':
          // Reject each request
          await Promise.all(
            requestIds.map(id =>
              fetch(`/api/requests/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: RequestStatus.REJECTED, rejectionReason: 'Bulk reject' })
              })
            )
          )
          break
        case 'schedule':
          endpoint = `/api/schedule/optimize`
          body = { requestIds }
          await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          })
          break
        case 'delete':
          // Delete each request
          await Promise.all(
            requestIds.map(id =>
              fetch(`/api/requests/${id}`, { method: 'DELETE' })
            )
          )
          break
        default:
          throw new Error('Unknown action')
      }

      notify.success('Bulk Action Complete', `Applied ${action} to ${requestIds.length} requests`)
      fetchRequests()
      clearSelection()
    } catch (error) {
      notify.error('Bulk Action Failed', 'Could not complete bulk action')
      throw error
    }
  }
  
  return (
    <DashboardLayout>
      <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold gradient-text">
              Meeting Requests
            </h1>
            <p className="text-gray-400 mt-2">
              Manage and qualify meeting requests for the World Congress
            </p>
          </div>
          
          <button className="neumorphic-button ripple text-primary-400 font-semibold hover-lift">
            <span className="flex items-center gap-2">
              <Plus size={20} />
              New Request
            </span>
          </button>
        </div>
        </FadeIn>
        
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
        
        {/* Bulk Actions */}
        {!loading && requests.length > 0 && (
          <BulkActions 
            requests={requests}
            onBulkAction={handleBulkAction}
          />
        )}
        
        {/* Requests List */}
        <div className="space-y-4">
          {loading ? (
            // Loading skeleton
            [...Array(5)].map((_, i) => (
              <SkeletonCard key={i} />
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
            requests.map((request, index) => (
              <FadeIn key={request.id} delay={index * 50}>
              <div
                className="neumorphic-card card-glow p-6 hover-lift transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Checkbox for bulk selection */}
                  <div className="flex items-start pt-1">
                    <input
                      type="checkbox"
                      checked={isSelected(request.id)}
                      onChange={() => toggleSelection(request.id)}
                      className="w-4 h-4 rounded border-gray-600 bg-dark-700 text-primary-500 focus:ring-primary-500 cursor-pointer"
                    />
                  </div>

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
                  
                  {/* Quick Actions */}
                  <div className="flex-shrink-0">
                    <QuickActions 
                      request={request}
                      onAction={(action) => handleQuickAction(action, request)}
                      compact={false}
                    />
                  </div>
                </div>
              </div>
              </FadeIn>
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
      </PageTransition>
    </DashboardLayout>
  )
}
