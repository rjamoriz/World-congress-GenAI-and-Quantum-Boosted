'use client'

import DashboardLayout from '@/components/DashboardLayout'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-gray-400 mt-2">
            Configure application preferences
          </p>
        </div>
        
        <div className="neumorphic-card p-12 text-center">
          <Settings className="mx-auto mb-4 text-gray-400" size={64} />
          <h3 className="text-xl font-semibold mb-2">Settings Module</h3>
          <p className="text-gray-400">
            This page will include API configuration, scheduling parameters, and user preferences.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
