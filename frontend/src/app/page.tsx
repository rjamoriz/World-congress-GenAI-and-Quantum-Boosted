'use client'

import { useEffect, useState } from 'react'
import { Calendar, Users, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import { QuantumOptimizer } from '@/components/QuantumOptimizer';
import { VoiceChatSimple } from '@/components/VoiceChatSimple';
import EventAssistant from '@/components/EventAssistant';
import { apiClient } from '@/lib/api'

export default function Home() {
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingQualification: 0,
    qualifiedRequests: 0,
    scheduledMeetings: 0,
    avgImportanceScore: 0,
    activeHosts: 0
  })
  
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchStats()
  }, [])
  
  async function fetchStats() {
    try {
      const [requestsRes, hostsRes] = await Promise.all([
        apiClient.get('/requests?limit=1'),
        apiClient.get('/hosts?isActive=true&limit=1')
      ])
      
      // Mock stats for now - in production, create dedicated endpoint
      setStats({
        totalRequests: requestsRes.data.pagination?.total || 0,
        pendingQualification: Math.floor((requestsRes.data.pagination?.total || 0) * 0.3),
        qualifiedRequests: Math.floor((requestsRes.data.pagination?.total || 0) * 0.5),
        scheduledMeetings: Math.floor((requestsRes.data.pagination?.total || 0) * 0.2),
        avgImportanceScore: 72,
        activeHosts: hostsRes.data.pagination?.total || 0
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              Copilot Dashboard
            </h1>
            <p className="text-gray-400 mt-2">
              AI-powered agenda management for World Congress
            </p>
          </div>
          
          <button className="neumorphic-button text-primary-400 font-semibold">
            <span className="flex items-center gap-2">
              <TrendingUp size={20} />
              Run Optimization
            </span>
          </button>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            title="Total Requests"
            value={stats.totalRequests}
            icon={Calendar}
            trend="+12%"
            color="blue"
            loading={loading}
          />
          
          <StatsCard
            title="Pending Qualification"
            value={stats.pendingQualification}
            icon={AlertCircle}
            trend="-5%"
            color="yellow"
            loading={loading}
          />
          
          <StatsCard
            title="Qualified Requests"
            value={stats.qualifiedRequests}
            icon={CheckCircle}
            trend="+18%"
            color="green"
            loading={loading}
          />
          
          <StatsCard
            title="Scheduled Meetings"
            value={stats.scheduledMeetings}
            icon={Clock}
            trend="+8%"
            color="purple"
            loading={loading}
          />
          
          <StatsCard
            title="Avg Importance Score"
            value={stats.avgImportanceScore}
            icon={TrendingUp}
            trend="+3"
            color="indigo"
            loading={loading}
          />
          
          <StatsCard
            title="Active Hosts"
            value={stats.activeHosts}
            icon={Users}
            color="pink"
            loading={loading}
          />
        </div>
        
        {/* Request List */}
        <div className="neumorphic-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Recent Requests</h2>
            <div className="flex gap-4">
              <select className="neumorphic-input py-2 px-4">
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="qualified">Qualified</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>
          </div>
          
          <RequestList />
        </div>

        {/* Event Assistant Section */}
        <div className="col-span-full">
          <EventAssistant />
        </div>
      </div>
    </DashboardLayout>
  )
}
