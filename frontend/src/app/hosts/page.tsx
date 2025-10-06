'use client'

import DashboardLayout from '@/components/DashboardLayout'
import { Users, Briefcase, Star, Calendar } from 'lucide-react'

export default function HostsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            Host Management
          </h1>
          <p className="text-gray-400 mt-2">
            Manage host profiles and availability
          </p>
        </div>
        
        <div className="neumorphic-card p-12 text-center">
          <Users className="mx-auto mb-4 text-primary-400" size={64} />
          <h3 className="text-xl font-semibold mb-2">Hosts Module</h3>
          <p className="text-gray-400">
            This page will display host profiles, availability calendars, and meeting statistics.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
