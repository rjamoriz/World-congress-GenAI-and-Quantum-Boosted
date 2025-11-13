'use client'

import { useState } from 'react'
import { Waves, Settings, Play, Pause, TrendingUp, Zap, Activity, Database } from 'lucide-react'
import { apiClient } from '@/lib/api'

interface DWaveConfig {
  solver: 'simulated_annealing' | 'dwave_sampler' | 'hybrid_sampler'
  numReads: number
  numSweeps: number
  betaRange: [number, number]
  chainStrength: number
}

interface DWaveState {
  isRunning: boolean
  progress: number
  schedule?: any[]
  metrics?: {
    scheduledMeetings: number
    totalRequests: number
    successRate: number
  }
  quboStats?: {
    totalVariables: number
    linearTerms: number
    quadraticTerms: number
    energy: number
  }
  computationTimeMs?: number
}

interface ScheduledMeeting {
  requestId: string
  hostName: string
  topic: string
  timeSlot: string
  importance: number
  expertise: string[]
}

export default function DWaveOptimizer() {
  const [config, setConfig] = useState<DWaveConfig>({
    solver: 'simulated_annealing',
    numReads: 1000,
    numSweeps: 10000,
    betaRange: [0.1, 10.0],
    chainStrength: 1.0
  })

  const [dwaveState, setDWaveState] = useState<DWaveState>({
    isRunning: false,
    progress: 0
  })

  const [showConfig, setShowConfig] = useState(false)
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null)

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  const runDWaveOptimization = async () => {
    setDWaveState(prev => ({ ...prev, isRunning: true, progress: 0 }))
    
    try {
      // Get hosts and requests from API
      showNotification('info', '🌊 Loading meeting data for D-Wave optimization...')
      const hostsResponse = await apiClient.get('/hosts')
      const requestsResponse = await apiClient.get('/requests')
      
      const hosts = hostsResponse.data.data || []
      const allRequests = requestsResponse.data.data || []
      
      // Use qualified or pending requests
      const requests = allRequests.filter((r: any) => 
        r.status === 'QUALIFIED' || r.status === 'qualified' || r.status === 'PENDING' || r.status === 'pending'
      ).slice(0, 20) // Limit to 20 for performance
      
      if (requests.length === 0) {
        showNotification('error', '❌ No qualified meeting requests found. Qualify some requests first.')
        setDWaveState(prev => ({ ...prev, isRunning: false }))
        return
      }
      
      showNotification('info', `⚛️ Preparing ${requests.length} meetings for quantum annealing...`)
      setDWaveState(prev => ({ ...prev, progress: 20 }))
      
      // Build QUBO problem
      showNotification('info', '🧮 Building QUBO model...')
      setDWaveState(prev => ({ ...prev, progress: 40 }))
      
      console.log('Sending D-Wave optimization request...')
      console.log('Config:', config)
      console.log('Hosts:', hosts.length)
      console.log('Requests:', requests.length)
      
      // Call D-Wave optimization API
      const response = await apiClient.post('/dwave/optimize', {
        hosts: hosts.map((h: any) => ({
          id: h._id,
          name: h.name,
          expertise: h.expertise || [],
          availability: h.availability || []
        })),
        requests: requests.map((r: any) => ({
          id: r._id,
          hostName: r.companyName || r.contactName || 'Attendee',
          topic: (r.requestedTopics && r.requestedTopics[0]) || r.meetingType || 'Meeting',
          importance: r.urgency === 'HIGH' ? 90 : r.urgency === 'MEDIUM' ? 70 : 50,
          expertise: r.requestedTopics || [],
          preferredDates: r.preferredDates || []
        })),
        config: {
          solver: config.solver,
          num_reads: config.numReads,
          num_sweeps: config.numSweeps,
          beta_range: config.betaRange,
          chain_strength: config.chainStrength
        }
      })
      
      setDWaveState(prev => ({ ...prev, progress: 80 }))
      showNotification('info', '🔍 Analyzing quantum annealing results...')
      
      setDWaveState(prev => ({ 
        ...prev, 
        progress: 100,
        schedule: response.data.schedule,
        metrics: response.data.metrics,
        quboStats: response.data.quboStats,
        computationTimeMs: response.data.computationTimeMs
      }))
      
      showNotification('success', `✨ D-Wave optimization complete! Scheduled ${response.data.schedule?.length || 0} meetings`)
      
    } catch (error: any) {
      console.error('D-Wave optimization failed:', error)
      const errorMsg = error.response?.data?.error || error.message
      showNotification('error', `❌ D-Wave optimization failed: ${errorMsg}`)
    } finally {
      setDWaveState(prev => ({ ...prev, isRunning: false }))
    }
  }

  const stopOptimization = () => {
    setDWaveState(prev => ({ ...prev, isRunning: false, progress: 0 }))
    showNotification('info', '⏹️ D-Wave optimization stopped')
  }

  return (
    <div className="neumorphic-card p-6 border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-blue-950/20">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl border-2 ${
          notification.type === 'success' 
            ? 'bg-green-500/20 border-green-500 text-green-400' 
            : notification.type === 'error'
            ? 'bg-red-500/20 border-red-500 text-red-400'
            : 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
        } backdrop-blur-lg`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/20 rounded-xl border-2 border-cyan-500/50">
            <Waves className="text-cyan-400" size={32} />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-cyan-400">D-Wave Quantum Annealing</h3>
            <p className="text-sm text-gray-400">Ocean SDK - Simulated Annealing (Offline Mode)</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 rounded-lg border-2 border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all"
          >
            <Settings size={20} />
          </button>
          
          {dwaveState.isRunning ? (
            <button
              onClick={stopOptimization}
              className="px-4 py-2 rounded-lg border-2 border-red-500 bg-red-500/20 text-red-400 font-semibold hover:bg-red-500/30 transition-all"
            >
              <span className="flex items-center gap-2">
                <Pause size={20} />
                Stop Annealing
              </span>
            </button>
          ) : (
            <button
              onClick={runDWaveOptimization}
              className="px-4 py-2 rounded-lg border-2 border-cyan-500 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 font-semibold hover:from-cyan-500/30 hover:to-blue-500/30 transition-all"
            >
              <span className="flex items-center gap-2">
                <Play size={20} />
                Run D-Wave Annealing
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="mb-6 p-5 bg-cyan-900/20 border-2 border-cyan-500/30 rounded-xl">
          <h4 className="font-semibold mb-4 flex items-center gap-2 text-cyan-300">
            <Settings size={20} />
            D-Wave Annealing Configuration
          </h4>
          
          <div className="space-y-4">
            {/* Solver Type */}
            <div>
              <label className="block text-sm text-cyan-300 font-semibold mb-2">Solver Type</label>
              <select
                value={config.solver}
                onChange={(e) => setConfig(prev => ({ ...prev, solver: e.target.value as any }))}
                className="w-full py-2 px-4 bg-dark-800 border-2 border-cyan-500/30 rounded-lg text-gray-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="simulated_annealing">Simulated Annealing (Offline - No Token)</option>
                <option value="dwave_sampler">D-Wave Hardware (Cloud - Requires Token)</option>
                <option value="hybrid_sampler">Hybrid Solver (Cloud - Large Problems)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {config.solver === 'simulated_annealing' 
                  ? '✅ Works offline without D-Wave API token'
                  : '⚠️ Requires D-Wave API token and cloud connection'
                }
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Num Reads */}
              <div>
                <label className="block text-sm text-cyan-300 font-semibold mb-2">Number of Reads</label>
                <input
                  type="number"
                  value={config.numReads}
                  onChange={(e) => setConfig(prev => ({ ...prev, numReads: parseInt(e.target.value) }))}
                  className="w-full py-2 px-4 bg-dark-800 border-2 border-cyan-500/30 rounded-lg text-gray-200 focus:border-cyan-500 focus:outline-none"
                  min="100"
                  max="10000"
                  step="100"
                />
                <p className="text-xs text-gray-500 mt-1">Quantum annealing cycles (1000 recommended)</p>
              </div>

              {/* Sweeps */}
              <div>
                <label className="block text-sm text-cyan-300 font-semibold mb-2">Annealing Sweeps</label>
                <input
                  type="number"
                  value={config.numSweeps}
                  onChange={(e) => setConfig(prev => ({ ...prev, numSweeps: parseInt(e.target.value) }))}
                  className="w-full py-2 px-4 bg-dark-800 border-2 border-cyan-500/30 rounded-lg text-gray-200 focus:border-cyan-500 focus:outline-none"
                  min="1000"
                  max="50000"
                  step="1000"
                />
                <p className="text-xs text-gray-500 mt-1">Monte Carlo sweeps for simulation (10000 recommended)</p>
              </div>

              {/* Chain Strength */}
              <div>
                <label className="block text-sm text-cyan-300 font-semibold mb-2">Chain Strength</label>
                <input
                  type="number"
                  value={config.chainStrength}
                  onChange={(e) => setConfig(prev => ({ ...prev, chainStrength: parseFloat(e.target.value) }))}
                  className="w-full py-2 px-4 bg-dark-800 border-2 border-cyan-500/30 rounded-lg text-gray-200 focus:border-cyan-500 focus:outline-none"
                  min="0.1"
                  max="10.0"
                  step="0.1"
                />
                <p className="text-xs text-gray-500 mt-1">Embedding chain coupling strength</p>
              </div>

              {/* Beta Range */}
              <div>
                <label className="block text-sm text-cyan-300 font-semibold mb-2">Beta Range</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={config.betaRange[0]}
                    onChange={(e) => setConfig(prev => ({ ...prev, betaRange: [parseFloat(e.target.value), prev.betaRange[1]] }))}
                    className="w-full py-2 px-4 bg-dark-800 border-2 border-cyan-500/30 rounded-lg text-gray-200 focus:border-cyan-500 focus:outline-none"
                    min="0.01"
                    max="1.0"
                    step="0.01"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="number"
                    value={config.betaRange[1]}
                    onChange={(e) => setConfig(prev => ({ ...prev, betaRange: [prev.betaRange[0], parseFloat(e.target.value)] }))}
                    className="w-full py-2 px-4 bg-dark-800 border-2 border-cyan-500/30 rounded-lg text-gray-200 focus:border-cyan-500 focus:outline-none"
                    min="1.0"
                    max="100.0"
                    step="1.0"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Temperature schedule for annealing</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Cards - Different Design */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border border-cyan-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="text-cyan-400" size={16} />
            <div className="text-xs text-cyan-300 font-semibold">MODE</div>
          </div>
          <div className="text-xl font-bold text-cyan-400">
            {config.solver === 'simulated_annealing' ? 'Offline' : 'Cloud'}
          </div>
        </div>
        
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="text-blue-400" size={16} />
            <div className="text-xs text-blue-300 font-semibold">READS</div>
          </div>
          <div className="text-xl font-bold text-blue-400">{config.numReads}</div>
        </div>
        
        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-purple-400" size={16} />
            <div className="text-xs text-purple-300 font-semibold">SWEEPS</div>
          </div>
          <div className="text-xl font-bold text-purple-400">{config.numSweeps}</div>
        </div>
        
        <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Database className="text-green-400" size={16} />
            <div className="text-xs text-green-300 font-semibold">VARIABLES</div>
          </div>
          <div className="text-xl font-bold text-green-400">
            {dwaveState.quboStats?.totalVariables || 0}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {dwaveState.isRunning && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-cyan-300 mb-2">
            <span className="font-semibold">⚛️ Quantum Annealing in Progress</span>
            <span>{dwaveState.progress}%</span>
          </div>
          <div className="w-full bg-dark-800 rounded-full h-3 border border-cyan-500/30">
            <div 
              className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300 relative overflow-hidden"
              style={{ width: `${dwaveState.progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {dwaveState.schedule && (
        <div className="bg-gradient-to-br from-cyan-950/40 to-blue-950/40 p-5 rounded-xl border-2 border-cyan-500/30">
          <h4 className="font-semibold mb-4 flex items-center gap-2 text-cyan-300 text-lg">
            <Waves size={20} />
            D-Wave Annealing Results
          </h4>
          
          {/* Metrics */}
          {dwaveState.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
              <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                <div className="text-2xl font-bold text-green-400">
                  {dwaveState.metrics.scheduledMeetings || 0}
                </div>
                <div className="text-xs text-gray-400 font-semibold">Scheduled</div>
              </div>
              
              <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                <div className="text-2xl font-bold text-yellow-400">
                  {(dwaveState.metrics.totalRequests || 0) - (dwaveState.metrics.scheduledMeetings || 0)}
                </div>
                <div className="text-xs text-gray-400 font-semibold">Unscheduled</div>
              </div>
              
              <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                <div className="text-2xl font-bold text-cyan-400">
                  {dwaveState.metrics.successRate?.toFixed(1) || 0}%
                </div>
                <div className="text-xs text-gray-400 font-semibold">Success Rate</div>
              </div>
              
              <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                <div className="text-2xl font-bold text-purple-400">
                  {dwaveState.quboStats?.energy?.toFixed(0) || 0}
                </div>
                <div className="text-xs text-gray-400 font-semibold">QUBO Energy</div>
              </div>
              
              <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                <div className="text-2xl font-bold text-blue-400">
                  {dwaveState.computationTimeMs || 0}ms
                </div>
                <div className="text-xs text-gray-400 font-semibold">Computation</div>
              </div>
            </div>
          )}

          {/* QUBO Stats */}
          {dwaveState.quboStats && (
            <div className="grid grid-cols-3 gap-3 mb-5 p-4 bg-cyan-900/20 rounded-lg border border-cyan-500/20">
              <div className="text-center">
                <div className="text-lg font-bold text-cyan-400">
                  {dwaveState.quboStats.totalVariables}
                </div>
                <div className="text-xs text-gray-400">Variables</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">
                  {dwaveState.quboStats.linearTerms}
                </div>
                <div className="text-xs text-gray-400">Linear Terms</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-400">
                  {dwaveState.quboStats.quadraticTerms}
                </div>
                <div className="text-xs text-gray-400">Quadratic Terms</div>
              </div>
            </div>
          )}

          {/* Scheduled Meetings */}
          {dwaveState.schedule && dwaveState.schedule.length > 0 && (
            <div className="space-y-3">
              <h5 className="text-sm font-semibold text-cyan-300 mb-3 flex items-center gap-2">
                <Waves size={16} />
                Scheduled Meetings ({dwaveState.schedule.length})
              </h5>
              <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                {dwaveState.schedule.map((meeting: ScheduledMeeting, idx: number) => (
                  <div key={idx} className="p-4 bg-dark-800/50 rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-cyan-300">{meeting.topic}</div>
                        <div className="text-sm text-gray-400 mt-1">Host: {meeting.hostName}</div>
                        {meeting.expertise && meeting.expertise.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {meeting.expertise.map((exp, i) => (
                              <span key={i} className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
                                {exp}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-sm font-semibold text-blue-400 bg-blue-500/10 px-3 py-1 rounded border border-blue-500/30">
                          {meeting.timeSlot}
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          Priority: <span className="text-cyan-400 font-semibold">{meeting.importance}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* D-Wave Info Banner */}
      <div className="mt-4 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <Waves size={20} className="text-cyan-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-cyan-300">
            <strong className="text-cyan-400">D-Wave Quantum Annealing:</strong> Uses quantum tunneling and superposition 
            to explore the energy landscape of QUBO problems. The simulator uses simulated annealing with Metropolis-Hastings 
            sampling to approximate quantum behavior. Real D-Wave hardware provides native quantum advantage for 
            combinatorial optimization problems like meeting scheduling.
          </div>
        </div>
      </div>
    </div>
  )
}
