'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { 
  Clock, 
  CheckCircle, 
  Calendar, 
  XCircle, 
  TrendingUp,
  Building2,
  User,
  Mail,
  AlertCircle,
  Sparkles,
  Filter
} from 'lucide-react'
import { MeetingRequest, RequestStatus } from '@agenda-manager/shared'
import { useNotify } from '@/contexts/NotificationContext'
import QuickActions from './QuickActions'
import { SkeletonKanban } from './Skeleton'
import PageTransition from './PageTransition'

interface KanbanColumn {
  id: RequestStatus
  title: string
  icon: any
  color: string
  bgColor: string
}

const columns: KanbanColumn[] = [
  {
    id: RequestStatus.PENDING,
    title: 'New Requests',
    icon: Clock,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10 border-yellow-500/30'
  },
  {
    id: RequestStatus.QUALIFIED,
    title: 'Qualified',
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/30'
  },
  {
    id: RequestStatus.SCHEDULED,
    title: 'Scheduled',
    icon: Calendar,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/30'
  },
  {
    id: RequestStatus.COMPLETED,
    title: 'Completed',
    icon: Sparkles,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/30'
  },
  {
    id: RequestStatus.REJECTED,
    title: 'Rejected',
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/30'
  }
]

export default function KanbanBoard() {
  const [requests, setRequests] = useState<MeetingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTier, setFilterTier] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const notify = useNotify()

  useEffect(() => {
    fetchRequests()
  }, [])

  async function fetchRequests() {
    try {
      const res = await fetch('/api/requests?limit=100')
      const data = await res.json()
      if (data.success) {
        setRequests(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
      notify.error('Load Failed', 'Could not load meeting requests')
    } finally {
      setLoading(false)
    }
  }

  async function updateRequestStatus(requestId: string, newStatus: RequestStatus) {
    const request = requests.find(r => r.id === requestId)
    if (!request) return

    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (res.ok) {
        // Update local state
        setRequests(prev => 
          prev.map(req => 
            req.id === requestId 
              ? { ...req, status: newStatus }
              : req
          )
        )
        
        // Show success notification based on new status
        const company = request.companyName
        switch (newStatus) {
          case RequestStatus.QUALIFIED:
            notify.requestQualified(company, request.importanceScore || 0)
            break
          case RequestStatus.SCHEDULED:
            notify.requestScheduled(company, 'Host')
            break
          case RequestStatus.COMPLETED:
            notify.success('Meeting Completed', `${company} meeting marked as complete`)
            break
          case RequestStatus.REJECTED:
            notify.warning('Request Rejected', `${company} request has been rejected`)
            break
          default:
            notify.success('Status Updated', `${company} moved to ${newStatus}`)
        }
      } else {
        throw new Error('Update failed')
      }
    } catch (error) {
      console.error('Failed to update request:', error)
      notify.error('Update Failed', 'Could not update request status')
      // Revert on error
      fetchRequests()
    }
  }

  function onDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result

    // Dropped outside the list
    if (!destination) return

    // Dropped in same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    // Update status
    const newStatus = destination.droppableId as RequestStatus
    const requestId = draggableId

    updateRequestStatus(requestId, newStatus)
  }

  function getRequestsByStatus(status: RequestStatus): MeetingRequest[] {
    let filtered = requests.filter(req => req.status === status)
    
    if (filterTier !== 'all') {
      filtered = filtered.filter(req => req.companyTier === filterTier)
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(req => req.meetingType === filterType)
    }
    
    return filtered
  }

  const handleQuickAction = async (action: string, request: MeetingRequest) => {
    try {
      let endpoint = ''
      let method = 'POST'
      let body: any = {}

      switch (action) {
        case 'qualify':
          endpoint = `/api/qualification/${request.id}/qualify`
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton h-8 w-64 rounded-lg" />
            <div className="skeleton h-4 w-96 rounded" />
          </div>
          <div className="skeleton h-10 w-32 rounded-lg" />
        </div>
        <SkeletonKanban />
      </div>
    )
  }

  return (
    <PageTransition>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Meeting Workflow</h1>
          <p className="text-gray-400">Drag cards to move them through the pipeline</p>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="neumorphic-input text-sm"
          >
            <option value="all">All Tiers</option>
            <option value="tier_1">Tier 1</option>
            <option value="tier_2">Tier 2</option>
            <option value="tier_3">Tier 3</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="neumorphic-input text-sm"
          >
            <option value="all">All Types</option>
            <option value="strategic">Strategic</option>
            <option value="operational">Operational</option>
            <option value="sales">Sales</option>
            <option value="partnership">Partnership</option>
            <option value="technical">Technical</option>
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-5 gap-4">
          {columns.map(column => {
            const columnRequests = getRequestsByStatus(column.id)
            const Icon = column.icon

            return (
              <div key={column.id} className="flex flex-col">
                {/* Column Header */}
                <div className={`neumorphic-card p-4 mb-3 ${column.bgColor} border`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className={column.color} size={20} />
                      <h3 className="font-semibold">{column.title}</h3>
                    </div>
                    <span className={`text-sm px-2 py-0.5 rounded ${column.bgColor} ${column.color}`}>
                      {columnRequests.length}
                    </span>
                  </div>
                </div>

                {/* Droppable Column */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-3 p-2 rounded-xl transition-colors ${
                        snapshot.isDraggingOver 
                          ? 'bg-primary-500/10 border-2 border-primary-500/30' 
                          : 'bg-transparent border-2 border-transparent'
                      }`}
                      style={{ minHeight: '400px' }}
                    >
                      {columnRequests.map((request, index) => (
                        <Draggable
                          key={request.id}
                          draggableId={request.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`neumorphic-card card-glow p-4 cursor-move transition-all duration-300 ease-out ${
                                snapshot.isDragging 
                                  ? 'rotate-2 scale-105 shadow-2xl ring-2 ring-primary-500/50' 
                                  : 'hover:scale-102 hover:-translate-y-1'
                              }`}
                            >
                              {/* Card Content */}
                              <div className="space-y-3">
                                {/* Company Name */}
                                <div>
                                  <h4 className="font-semibold text-sm mb-1">
                                    {request.companyName}
                                  </h4>
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Building2 size={12} />
                                    {request.companyTier.replace('_', ' ').toUpperCase()}
                                  </div>
                                </div>

                                {/* Contact */}
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                  <User size={12} />
                                  {request.contactName}
                                </div>

                                {/* Meeting Type */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-2 py-1 bg-dark-600 rounded">
                                    {request.meetingType}
                                  </span>
                                  {request.urgency === 'critical' && (
                                    <AlertCircle className="text-red-400" size={14} />
                                  )}
                                </div>

                                {/* Score (if qualified) */}
                                {request.importanceScore && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <TrendingUp size={12} className="text-green-400" />
                                    <span className="text-green-400">
                                      Score: {request.importanceScore}
                                    </span>
                                  </div>
                                )}

                                {/* Topics */}
                                {request.requestedTopics && request.requestedTopics.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {request.requestedTopics.slice(0, 2).map((topic, i) => (
                                      <span 
                                        key={i}
                                        className="text-xs px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded"
                                      >
                                        {topic.length > 15 ? topic.slice(0, 15) + '...' : topic}
                                      </span>
                                    ))}
                                    {request.requestedTopics.length > 2 && (
                                      <span className="text-xs text-gray-500">
                                        +{request.requestedTopics.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Date */}
                                <div className="text-xs text-gray-500 pt-2 border-t border-dark-600">
                                  {new Date(request.submittedAt).toLocaleDateString()}
                                </div>

                                {/* Quick Actions */}
                                <div className="pt-2 border-t border-dark-600">
                                  <QuickActions 
                                    request={request} 
                                    onAction={(action) => handleQuickAction(action, request)}
                                    compact={true}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {/* Empty state */}
                      {columnRequests.length === 0 && (
                        <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                          No items
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      {/* Stats Footer */}
      <div className="neumorphic-card p-6">
        <div className="grid grid-cols-5 gap-4 text-center">
          {columns.map(column => {
            const count = getRequestsByStatus(column.id).length
            const Icon = column.icon
            
            return (
              <div key={column.id}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Icon className={column.color} size={16} />
                  <span className="text-2xl font-bold">{count}</span>
                </div>
                <div className="text-sm text-gray-400">{column.title}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
    </PageTransition>
  )
}
