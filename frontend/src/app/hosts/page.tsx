'use client'

import { useEffect, useState } from 'react'
import { Users, Briefcase, Star, Calendar, Clock, Plus, Mail } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import { apiClient } from '@/lib/api'
import { Host } from '@agenda-manager/shared'

export default function HostsPage() {
  const [hosts, setHosts] = useState<Host[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchHosts()
  }, [])
  
  async function fetchHosts() {
    setLoading(true)
    try {
      console.log('Fetching hosts...')
      const response = await apiClient.get('/hosts')
      console.log('Hosts response:', response.data)
      setHosts(response.data.data || [])
    } catch (error: any) {
      console.error('Failed to fetch hosts:', error)
      console.error('Error details:', error.response?.data || error.message)
      setHosts([])
    } finally {
      setLoading(false)
    }
  }
  
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'senior': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'mid': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'junior': return 'bg-green-500/20 text-green-400 border-green-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              Host Management
            </h1>
            <p className="text-gray-400 mt-2">
              Manage host profiles and availability
            </p>
          </div>
          
          <button className="neumorphic-button text-primary-400 font-semibold">
            <span className="flex items-center gap-2">
              <Plus size={20} />
              Add Host
            </span>
          </button>
        </div>
        
        {loading ? (
          // Loading skeleton
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="neumorphic-card p-6 animate-pulse">
                <div className="h-32 bg-dark-700 rounded-xl" />
              </div>
            ))}
          </div>
        ) : hosts.length === 0 ? (
          // Empty state
          <div className="neumorphic-card p-12 text-center">
            <Users className="mx-auto mb-4 text-gray-500" size={64} />
            <h3 className="text-xl font-semibold mb-2">No hosts found</h3>
            <p className="text-gray-400 mb-4">
              Start the backend and import data to see hosts
            </p>
            <button className="neumorphic-button text-primary-400">
              Import Sample Hosts
            </button>
          </div>
        ) : (
          // Host cards
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hosts.map((host) => (
              <div
                key={host.id}
                className="neumorphic-card p-6 hover:scale-[1.02] transition-transform cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{host.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                      <Mail size={16} />
                      {host.email}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getTierColor(host.role)}`}>
                      {host.role}
                    </span>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${host.isActive ? 'bg-green-400' : 'bg-gray-500'}`} />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase size={16} className="text-primary-400" />
                    <span className="text-gray-300">{host.department}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={16} className="text-primary-400" />
                    <span className="text-gray-300">Max {host.maxMeetingsPerDay} meetings/day</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar size={16} className="text-primary-400" />
                    <span className="text-gray-300">
                      {host.availability?.length || 0} time slots available
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex flex-wrap gap-1">
                    {host.expertise?.slice(0, 3).map((skill, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-dark-600 rounded-lg">
                        {skill}
                      </span>
                    ))}
                    {host.expertise && host.expertise.length > 3 && (
                      <span className="text-xs px-2 py-1 bg-dark-600 rounded-lg">
                        +{host.expertise.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 neumorphic-button text-sm py-2 text-primary-400">
                    View Schedule
                  </button>
                  <button className="flex-1 neumorphic-button text-sm py-2 text-gray-400">
                    Edit Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
