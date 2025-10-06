'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Calendar, Cpu, Zap, Settings, Play, BarChart3, Clock } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import { apiClient } from '@/lib/api'

export default function SchedulePage() {
  const [algorithm, setAlgorithm] = useState('hybrid')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<any>(null)
  const [scheduledMeetings, setScheduledMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchScheduledMeetings()
  }, [])
  
  async function fetchScheduledMeetings() {
    try {
      const response = await apiClient.get('/schedule')
      console.log('Scheduled meetings:', response.data)
      setScheduledMeetings(response.data.data || [])
    } catch (error: any) {
      console.error('Failed to fetch scheduled meetings:', error)
      setScheduledMeetings([])
    } finally {
      setLoading(false)
    }
  }
  
  async function runOptimization() {
    setIsOptimizing(true)
    try {
      const response = await apiClient.post('/schedule/optimize', {
        algorithm,
        maxIterations: algorithm === 'quantum' ? 1000 : 500,
        includeUnscheduled: true
      })
      
      setOptimizationResult(response.data.data)
      await fetchScheduledMeetings() // Refresh the list
      
    } catch (error: any) {
      console.error('Optimization failed:', error)
      alert('Optimization failed: ' + (error.response?.data?.error || error.message))
    } finally {
      setIsOptimizing(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              Schedule Optimizer
            </h1>
            <p className="text-gray-400 mt-2">
              Quantum-inspired scheduling optimization for World Congress
            </p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={runOptimization}
              disabled={isOptimizing}
              className="neumorphic-button text-primary-400 font-semibold disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                {isOptimizing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-400"></div>
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    Run Optimization
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
        
        {/* Algorithm Selection */}
        <div className="neumorphic-card p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Settings size={24} />
            Algorithm Configuration
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              onClick={() => setAlgorithm('classical')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                algorithm === 'classical' 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Cpu className="text-blue-400" size={24} />
                <h4 className="font-semibold">Classical Greedy</h4>
              </div>
              <p className="text-sm text-gray-400">
                Fast, deterministic algorithm with constraint satisfaction
              </p>
            </div>
            
            <div 
              onClick={() => setAlgorithm('quantum')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                algorithm === 'quantum' 
                  ? 'border-purple-500 bg-purple-500/10' 
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="text-purple-400" size={24} />
                <h4 className="font-semibold">Quantum-Inspired</h4>
              </div>
              <p className="text-sm text-gray-400">
                Simulated annealing with quantum optimization principles
              </p>
            </div>
            
            <div 
              onClick={() => setAlgorithm('hybrid')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                algorithm === 'hybrid' 
                  ? 'border-green-500 bg-green-500/10' 
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Zap className="text-green-400" size={24} />
                <h4 className="font-semibold">Hybrid Approach</h4>
              </div>
              <p className="text-sm text-gray-400">
                Combines classical and quantum methods for optimal results
              </p>
            </div>
          </div>
        </div>
        
        {/* Optimization Results */}
        {optimizationResult && (
          <div className="neumorphic-card p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 size={24} />
              Optimization Results
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-dark-700 p-4 rounded-xl">
                <div className="text-2xl font-bold text-green-400">
                  {optimizationResult.assignments?.length || 0}
                </div>
                <div className="text-sm text-gray-400">Meetings Scheduled</div>
              </div>
              
              <div className="bg-dark-700 p-4 rounded-xl">
                <div className="text-2xl font-bold text-yellow-400">
                  {optimizationResult.unscheduled?.length || 0}
                </div>
                <div className="text-sm text-gray-400">Unscheduled</div>
              </div>
              
              <div className="bg-dark-700 p-4 rounded-xl">
                <div className="text-2xl font-bold text-blue-400">
                  {optimizationResult.computationTimeMs || 0}ms
                </div>
                <div className="text-sm text-gray-400">Computation Time</div>
              </div>
              
              <div className="bg-dark-700 p-4 rounded-xl">
                <div className="text-2xl font-bold text-purple-400">
                  {optimizationResult.algorithm || 'N/A'}
                </div>
                <div className="text-sm text-gray-400">Algorithm Used</div>
              </div>
            </div>
            
            {optimizationResult.explanation && (
              <div className="bg-dark-700 p-4 rounded-xl">
                <h4 className="font-semibold mb-2">Optimization Explanation</h4>
                <p className="text-gray-300 text-sm">{optimizationResult.explanation}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Scheduled Meetings */}
        <div className="neumorphic-card p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar size={24} />
            Scheduled Meetings ({scheduledMeetings.length})
          </h3>
          
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-dark-700 p-4 rounded-xl animate-pulse">
                  <div className="h-16 bg-dark-600 rounded" />
                </div>
              ))}
            </div>
          ) : scheduledMeetings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto mb-4 text-gray-500" size={48} />
              <p className="text-gray-400">No meetings scheduled yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Run the optimization to schedule qualified requests
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledMeetings.slice(0, 10).map((meeting: any, index) => (
                <div key={meeting.id || index} className="bg-dark-700 p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{meeting.requestId || 'Meeting'}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {meeting.timeSlot?.date} at {meeting.timeSlot?.startTime}
                        </span>
                        <span>Host: {meeting.hostId}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-400">Scheduled</div>
                      {meeting.score && (
                        <div className="text-xs text-gray-500">Score: {meeting.score}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
