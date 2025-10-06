'use client'

import DashboardLayout from '@/components/DashboardLayout'
import { Sparkles, Calendar } from 'lucide-react'

export default function SchedulePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            Schedule Optimizer
          </h1>
          <p className="text-gray-400 mt-2">
            Quantum-inspired scheduling optimization
          </p>
        </div>
        
        <div className="neumorphic-card p-12 text-center">
          <Sparkles className="mx-auto mb-4 text-primary-400" size={64} />
          <h3 className="text-xl font-semibold mb-2">Scheduler Module</h3>
          <p className="text-gray-400 mb-4">
            This page will display the scheduling interface with calendar view,
            optimization controls, and algorithm selection.
          </p>
          <div className="flex gap-4 justify-center">
            <button className="neumorphic-button text-primary-400 px-6 py-3">
              Run Classical Scheduler
            </button>
            <button className="neumorphic-button text-purple-400 px-6 py-3">
              Run Quantum-Inspired
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
