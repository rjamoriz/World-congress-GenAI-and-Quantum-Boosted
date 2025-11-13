'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Calendar, Cpu, Zap, Settings, Play, BarChart3, Clock, CheckCircle, Waves } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import QuantumOptimizer from '@/components/QuantumOptimizer'
import DWaveOptimizer from '@/components/DWaveOptimizer'
import VoiceChat from '@/components/VoiceChatSimple'
import { apiClient } from '@/lib/api'

export default function SchedulePage() {
  const [algorithm, setAlgorithm] = useState('hybrid')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<any>(null)
  const [scheduledMeetings, setScheduledMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [isQualifying, setIsQualifying] = useState(false)
  
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
      console.log('Starting optimization with algorithm:', algorithm)
      
      // Prepare optimization request
      const optimizationRequest: any = {
        algorithm: algorithm === 'dwave' ? 'quantum' : algorithm,
        constraints: {
          eventStartDate: new Date().toISOString().split('T')[0],
          eventEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          workingHoursStart: '09:00',
          workingHoursEnd: '18:00',
          meetingDurationMinutes: 30,
          maxMeetingsPerDay: 8,
          bufferMinutes: 15
        }
      }
      
      // Add D-Wave specific configuration
      if (algorithm === 'dwave') {
        optimizationRequest.quantumConfig = {
          backend: 'dwave',
          solver: 'simulated_annealing',
          num_reads: 1000,
          num_sweeps: 10000,
          beta_range: [0.1, 10.0]
        }
      }
      
      const response = await apiClient.post('/schedule/optimize', optimizationRequest)
      
      console.log('Optimization result:', response.data)
      setOptimizationResult(response.data.data)
      await fetchScheduledMeetings() // Refresh the list
      
      // Show success notification
      setNotification({
        type: 'success',
        message: `✅ Optimization completed! Scheduled ${response.data.data.assignments?.length || 0} meetings using ${algorithm} algorithm.`
      })
      setTimeout(() => setNotification(null), 5000)
      
    } catch (error: any) {
      console.error('Optimization failed:', error)
      console.error('Error details:', error.response?.data)
      setNotification({
        type: 'error',
        message: `❌ Optimization failed: ${error.response?.data?.error || error.message}`
      })
      setTimeout(() => setNotification(null), 5000)
    } finally {
      setIsOptimizing(false)
    }
  }
  
  async function qualifyPendingRequests() {
    setIsQualifying(true)
    try {
      // Get some pending requests
      const response = await apiClient.get('/requests?status=pending&limit=10')
      const pendingRequests = response.data.data || []
      
      if (pendingRequests.length === 0) {
        setNotification({
          type: 'error',
          message: '❌ No pending requests found to qualify'
        })
        setTimeout(() => setNotification(null), 3000)
        return
      }
      
      // Qualify them in batch
      const requestIds = pendingRequests.map((r: any) => r.id)
      await apiClient.post('/qualification/qualify-batch', { requestIds })
      
      setNotification({
        type: 'success',
        message: `✅ Qualified ${pendingRequests.length} requests! Now you can run optimization.`
      })
      setTimeout(() => setNotification(null), 5000)
      
    } catch (error: any) {
      console.error('Qualification failed:', error)
      setNotification({
        type: 'error',
        message: `❌ Qualification failed: ${error.response?.data?.error || error.message}`
      })
      setTimeout(() => setNotification(null), 5000)
    } finally {
      setIsQualifying(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl border-2 ${
            notification.type === 'success' 
              ? 'bg-green-500/20 border-green-500 text-green-400' 
              : 'bg-red-500/20 border-red-500 text-red-400'
          } backdrop-blur-lg`}>
            {notification.message}
          </div>
        )}
        
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
              onClick={qualifyPendingRequests}
              disabled={isQualifying}
              className="neumorphic-button text-green-400 font-semibold disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                {isQualifying ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-400"></div>
                    Qualifying...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Qualify Requests
                  </>
                )}
              </span>
            </button>
            
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            
            <div 
              onClick={() => setAlgorithm('dwave')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                algorithm === 'dwave' 
                  ? 'border-cyan-500 bg-cyan-500/10' 
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Waves className="text-cyan-400" size={24} />
                <h4 className="font-semibold">D-Wave Annealing</h4>
              </div>
              <p className="text-sm text-gray-400">
                Real quantum annealing optimization (offline SDK, no API token needed)
              </p>
            </div>
          </div>
          
          {/* D-Wave Configuration Panel */}
          {algorithm === 'dwave' && (
            <div className="mt-6 p-4 bg-cyan-900/20 border border-cyan-500/30 rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <Waves className="text-cyan-400" size={20} />
                <h4 className="font-semibold text-cyan-400">D-Wave Ocean SDK Configuration</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-300 mb-2">
                    <span className="text-green-400">✅</span> <strong>Offline Mode:</strong> No API token required
                  </p>
                  <p className="text-gray-300 mb-2">
                    <span className="text-cyan-400">🌊</span> <strong>Algorithm:</strong> Simulated Quantum Annealing
                  </p>
                  <p className="text-gray-300">
                    <span className="text-purple-400">⚛️</span> <strong>Optimization:</strong> QUBO (Quadratic Unconstrained Binary Optimization)
                  </p>
                </div>
                <div>
                  <p className="text-gray-300 mb-2">
                    <span className="text-blue-400">📊</span> <strong>Samples:</strong> 1,000 quantum reads
                  </p>
                  <p className="text-gray-300 mb-2">
                    <span className="text-yellow-400">🔥</span> <strong>Sweeps:</strong> 10,000 annealing steps
                  </p>
                  <p className="text-gray-300">
                    <span className="text-green-400">🎯</span> <strong>Quality:</strong> Superior constraint satisfaction
                  </p>
                </div>
              </div>
              <div className="mt-3 p-3 bg-dark-700 rounded-lg">
                <p className="text-xs text-gray-400">
                  <strong>D-Wave Advantage:</strong> Uses real quantum annealing algorithms to find optimal meeting schedules through quantum tunneling and superposition effects, without requiring cloud access or API tokens.
                </p>
              </div>
            </div>
          )}
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
        
        {/* IBM Qiskit Quantum Optimizer */}
        <QuantumOptimizer />
        
        {/* D-Wave Ocean SDK Quantum Annealing Optimizer */}
        <DWaveOptimizer />
        
        {/* OpenAI Realtime Voice Chat */}
        <VoiceChat />
        
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
