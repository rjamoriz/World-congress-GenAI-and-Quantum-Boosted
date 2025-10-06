'use client'

import { useEffect, useState } from 'react'
import { Building2, Mail, Calendar, TrendingUp, CheckCircle, Clock, XCircle } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { MeetingRequest } from '@agenda-manager/shared'

export default function RequestList() {
  const [requests, setRequests] = useState<MeetingRequest[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchRequests()
  }, [])
  
  async function fetchRequests() {
    try {
      const response = await apiClient.get('/requests?limit=10&sortBy=submittedAt&sortOrder=desc')
      setRequests(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'qualified':
        return <CheckCircle className="text-green-400" size={20} />
      case 'pending':
        return <Clock className="text-yellow-400" size={20} />
      case 'scheduled':
        return <Calendar className="text-blue-400" size={20} />
      case 'rejected':
        return <XCircle className="text-red-400" size={20} />
      default:
        return <Clock className="text-gray-400" size={20} />
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'qualified':
        return 'bg-green-500/20 text-green-400'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'scheduled':
        return 'bg-blue-500/20 text-blue-400'
      case 'rejected':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }
  
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse bg-dark-700 rounded-xl h-24" />
        ))}
      </div>
    )
  }
  
  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Calendar className="mx-auto mb-4" size={48} />
        <p>No requests found. Import synthetic data to get started.</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div
          key={request.id}
          className="glass-panel p-4 hover:bg-dark-700/70 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="text-primary-400" size={20} />
                <h3 className="text-lg font-semibold">{request.companyName}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                  {request.status}
                </span>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <span className="flex items-center gap-2">
                  <Mail size={16} />
                  {request.contactName}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar size={16} />
                  {new Date(request.submittedAt).toLocaleDateString()}
                </span>
                {request.importanceScore && (
                  <span className="flex items-center gap-2">
                    <TrendingUp size={16} />
                    Score: {request.importanceScore}
                  </span>
                )}
              </div>
              
              <div className="mt-2 flex gap-2">
                <span className="text-xs px-2 py-1 bg-dark-600 rounded-lg">
                  {request.meetingType}
                </span>
                <span className="text-xs px-2 py-1 bg-dark-600 rounded-lg">
                  {request.companyTier}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              {getStatusIcon(request.status)}
              {request.status === 'pending' && (
                <button className="neumorphic-button text-sm py-2 px-4 text-primary-400 hover:text-primary-300">
                  Qualify
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
