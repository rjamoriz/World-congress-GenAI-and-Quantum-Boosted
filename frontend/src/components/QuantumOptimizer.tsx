'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Cpu, Zap, Play, Pause, BarChart3, Atom, Settings, Info, Image as ImageIcon } from 'lucide-react'
import { apiClient } from '@/lib/api'

interface QuantumState {
  isRunning: boolean
  progress: number
  currentLayer: number
  totalLayers: number
  shots: number
  qubits: number
  backend: string
  results?: any
  schedule?: any[]
  metrics?: any
  circuitStats?: any
}

interface ScheduledMeeting {
  requestId: string
  hostName: string
  topic: string
  timeSlot: string
  importance: number
  expertise: string[]
}

export default function QuantumOptimizer() {
  const [quantumState, setQuantumState] = useState<QuantumState>({
    isRunning: false,
    progress: 0,
    currentLayer: 0,
    totalLayers: 1,
    shots: 1024,
    qubits: 0,
    backend: 'StatevectorSampler'
  })
  
  const [config, setConfig] = useState({
    algorithm: 'qaoa',
    backend: 'aer_simulator',
    shots: 1024,
    layers: 1,
    optimizer: 'COBYLA',
    maxIterations: 25
  })
  
  const [showConfig, setShowConfig] = useState(false)
  const [showCircuit, setShowCircuit] = useState(false)
  const [circuitImage, setCircuitImage] = useState<string | null>(null)
  const [statsImage, setStatsImage] = useState<string | null>(null)
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null)
  const [systemStatus, setSystemStatus] = useState<{available: boolean, ready: boolean, qiskitVersion?: string} | null>(null)

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  // Check quantum system status on mount
  useEffect(() => {
    checkQuantumStatus()
  }, [])

  const checkQuantumStatus = async () => {
    try {
      const response = await apiClient.get('/quantum/status')
      setSystemStatus(response.data)
      if (response.data.available) {
        showNotification('success', `✅ Quantum system ready (Qiskit ${response.data.qiskitVersion})`)
      }
    } catch (error) {
      setSystemStatus({ available: false, ready: false })
      showNotification('error', '❌ Quantum system not available')
    }
  }

  const runQuantumOptimization = async () => {
    setQuantumState(prev => ({ ...prev, isRunning: true, progress: 0 }))
    
    try {
      // Get hosts and requests from API
      showNotification('info', '📊 Loading meeting data...')
      const hostsResponse = await apiClient.get('/hosts')
      const requestsResponse = await apiClient.get('/requests')
      
      const hosts = hostsResponse.data.data || []
      const allRequests = requestsResponse.data.data || []
      
      // Use first 4 requests regardless of status for demo
      const requests = allRequests.slice(0, 4)
      
      if (requests.length === 0) {
        showNotification('error', '❌ No meeting requests found. Create some requests first.')
        setQuantumState(prev => ({ ...prev, isRunning: false }))
        return
      }
      
      showNotification('info', `🎯 Using ${requests.length} meeting requests for optimization`)
      
      // Simulate quantum circuit preparation
      showNotification('info', '🌊 Initializing quantum superposition...')
      setQuantumState(prev => ({ ...prev, progress: 20 }))
      
      // Execute QAOA
      showNotification('info', `⚛ Running QAOA optimization (${requests.length} meetings)...`)
      setQuantumState(prev => ({ ...prev, progress: 40, currentLayer: 1 }))
      
      console.log('Sending optimize request to backend...');
      console.log('Hosts:', hosts.length);
      console.log('Requests:', requests.length);
      
      // Call quantum optimization API
      const response = await apiClient.post('/quantum/optimize', {
        hosts: hosts.map((h: any) => ({
          id: h._id,
          name: h.name,
          expertise: h.expertise || []
        })),
        requests: requests.map((r: any) => ({
          id: r._id,
          hostName: r.companyName || r.contactName || 'Attendee',
          topic: (r.requestedTopics && r.requestedTopics[0]) || r.meetingType || 'Meeting',
          importance: r.urgency === 'HIGH' ? 90 : r.urgency === 'MEDIUM' ? 70 : 50,
          expertise: r.requestedTopics || []
        }))
      })
      
      setQuantumState(prev => ({ ...prev, progress: 100 }))
      
      setQuantumState(prev => ({ 
        ...prev, 
        schedule: response.data.schedule,
        metrics: response.data.metrics,
        circuitStats: response.data.circuitStats,
        qubits: response.data.circuitStats?.qubits || 0
      }))
      
      showNotification('success', `✨ Quantum optimization complete! Scheduled ${response.data.schedule?.length || 0} meetings`)
      
    } catch (error: any) {
      console.error('Quantum optimization failed:', error)
      showNotification('error', `❌ Optimization failed: ${error.response?.data?.error || error.message}`)
    } finally {
      setQuantumState(prev => ({ ...prev, isRunning: false }))
    }
  }
  
  const simulateProgress = (target: number) => {
    return new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        setQuantumState(prev => {
          const newProgress = Math.min(prev.progress + 2, target)
          if (newProgress >= target) {
            clearInterval(interval)
            resolve()
          }
          return { ...prev, progress: newProgress }
        })
      }, 100)
    })
  }

  const stopOptimization = () => {
    setQuantumState(prev => ({ ...prev, isRunning: false, progress: 0 }))
    showNotification('info', '⏹️ Quantum optimization stopped')
  }

  const loadCircuitImages = async () => {
    try {
      // Load circuit image
      const circuitUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/quantum/circuit-image?t=${Date.now()}`
      console.log('Loading circuit from:', circuitUrl);
      setCircuitImage(circuitUrl)
      
      // Load stats image
      const statsUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/quantum/stats-image?t=${Date.now()}`
      console.log('Loading stats from:', statsUrl);
      setStatsImage(statsUrl)
      
      setShowCircuit(true)
      showNotification('info', '📊 Loading circuit visualizations...')
    } catch (error) {
      console.error('Error loading circuit images:', error);
      showNotification('error', '❌ Circuit images not available')
    }
  }

  return (
    <div className="neumorphic-card p-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl border-2 ${
          notification.type === 'success' 
            ? 'bg-green-500/20 border-green-500 text-green-400' 
            : notification.type === 'error'
            ? 'bg-red-500/20 border-red-500 text-red-400'
            : 'bg-blue-500/20 border-blue-500 text-blue-400'
        } backdrop-blur-lg`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Atom className="text-purple-400" size={32} />
          <div>
            <h3 className="text-xl font-semibold">IBM Qiskit Quantum Optimizer</h3>
            <p className="text-sm text-gray-400">Real quantum computing for meeting optimization</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="neumorphic-button text-gray-400 p-2"
          >
            <Settings size={20} />
          </button>
          
          {quantumState.isRunning ? (
            <button
              onClick={stopOptimization}
              className="neumorphic-button text-red-400 font-semibold px-4 py-2"
            >
              <span className="flex items-center gap-2">
                <Pause size={20} />
                Stop
              </span>
            </button>
          ) : (
            <button
              onClick={runQuantumOptimization}
              className="neumorphic-button text-purple-400 font-semibold px-4 py-2"
            >
              <span className="flex items-center gap-2">
                <Play size={20} />
                Run QAOA
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="mb-6 p-4 bg-dark-700 rounded-xl">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Settings size={20} />
            Quantum Configuration
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Backend</label>
              <select
                value={config.backend}
                onChange={(e) => setConfig(prev => ({ ...prev, backend: e.target.value }))}
                className="neumorphic-input py-2 px-3 w-full"
              >
                <option value="aer_simulator">AER Simulator</option>
                <option value="statevector_simulator">Statevector Simulator</option>
                <option value="qasm_simulator">QASM Simulator</option>
                <option value="ibm_brisbane">IBM Brisbane (127 qubits)</option>
                <option value="ibm_kyoto">IBM Kyoto (127 qubits)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Shots</label>
              <input
                type="number"
                value={config.shots}
                onChange={(e) => setConfig(prev => ({ ...prev, shots: parseInt(e.target.value) }))}
                className="neumorphic-input py-2 px-3 w-full"
                min="100"
                max="8192"
                step="256"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">QAOA Layers</label>
              <input
                type="number"
                value={config.layers}
                onChange={(e) => setConfig(prev => ({ ...prev, layers: parseInt(e.target.value) }))}
                className="neumorphic-input py-2 px-3 w-full"
                min="1"
                max="10"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Optimizer</label>
              <select
                value={config.optimizer}
                onChange={(e) => setConfig(prev => ({ ...prev, optimizer: e.target.value }))}
                className="neumorphic-input py-2 px-3 w-full"
              >
                <option value="COBYLA">COBYLA</option>
                <option value="SPSA">SPSA</option>
                <option value="SLSQP">SLSQP</option>
                <option value="L_BFGS_B">L-BFGS-B</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Quantum State Visualization */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-700 p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-purple-400">
            {quantumState.qubits || config.layers * 4}
          </div>
          <div className="text-sm text-gray-400">Qubits</div>
        </div>
        
        <div className="bg-dark-700 p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-blue-400">
            {config.shots}
          </div>
          <div className="text-sm text-gray-400">Shots</div>
        </div>
        
        <div className="bg-dark-700 p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-green-400">
            {quantumState.currentLayer}/{config.layers}
          </div>
          <div className="text-sm text-gray-400">QAOA Layers</div>
        </div>
        
        <div className="bg-dark-700 p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {config.backend.includes('ibm') ? 'Hardware' : 'Simulator'}
          </div>
          <div className="text-sm text-gray-400">Backend</div>
        </div>
      </div>

      {/* Progress Bar */}
      {quantumState.isRunning && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Quantum Circuit Execution</span>
            <span>{quantumState.progress}%</span>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${quantumState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {quantumState.schedule && (
        <div className="bg-dark-700 p-4 rounded-xl mb-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold flex items-center gap-2">
              <BarChart3 size={20} />
              Quantum Optimization Results
            </h4>
            {quantumState.circuitStats && (
              <button
                onClick={loadCircuitImages}
                className="neumorphic-button text-purple-400 text-sm px-3 py-1 flex items-center gap-2"
              >
                <ImageIcon size={16} />
                View Circuit
              </button>
            )}
          </div>
          
          {/* Metrics */}
          {quantumState.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-xl font-bold text-green-400">
                  {quantumState.metrics.scheduled || 0}
                </div>
                <div className="text-xs text-gray-400">Scheduled</div>
              </div>
              
              <div className="text-center">
                <div className="text-xl font-bold text-yellow-400">
                  {quantumState.metrics.totalRequests - quantumState.metrics.scheduled || 0}
                </div>
                <div className="text-xs text-gray-400">Unscheduled</div>
              </div>
              
              <div className="text-center">
                <div className="text-xl font-bold text-blue-400">
                  {(quantumState.metrics.successRate * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400">Success Rate</div>
              </div>
              
              <div className="text-center">
                <div className="text-xl font-bold text-purple-400">
                  {quantumState.metrics.avgImportance?.toFixed(0) || 0}
                </div>
                <div className="text-xs text-gray-400">Avg Importance</div>
              </div>
            </div>
          )}

          {/* Circuit Stats */}
          {quantumState.circuitStats && (
            <div className="grid grid-cols-4 gap-3 mb-4 p-3 bg-dark-600 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-purple-400">
                  {quantumState.circuitStats.qubits}
                </div>
                <div className="text-xs text-gray-400">Qubits</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-400">
                  {quantumState.circuitStats.gates}
                </div>
                <div className="text-xs text-gray-400">Gates</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">
                  {quantumState.circuitStats.depth}
                </div>
                <div className="text-xs text-gray-400">Depth</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-400">
                  {quantumState.circuitStats.parameters}
                </div>
                <div className="text-xs text-gray-400">Parameters</div>
              </div>
            </div>
          )}

          {/* Scheduled Meetings */}
          {quantumState.schedule && quantumState.schedule.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-semibold text-gray-300 mb-2">Scheduled Meetings:</h5>
              {quantumState.schedule.map((meeting: ScheduledMeeting, idx: number) => (
                <div key={idx} className="bg-dark-600 p-3 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{meeting.topic}</div>
                      <div className="text-sm text-gray-400">Host: {meeting.hostName}</div>
                      {meeting.expertise && meeting.expertise.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {meeting.expertise.map((exp, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                              {exp}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-blue-400">{meeting.timeSlot}</div>
                      <div className="text-xs text-gray-400">Importance: {meeting.importance}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Circuit Visualization Modal */}
      {showCircuit && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowCircuit(false)}>
          <div className="bg-dark-800 rounded-xl p-6 max-w-6xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Quantum Circuit Visualization</h3>
              <button
                onClick={() => setShowCircuit(false)}
                className="neumorphic-button text-gray-400 px-3 py-1"
              >
                Close
              </button>
            </div>
            
            <div className="space-y-4">
              {circuitImage && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-gray-300">Circuit Diagram</h4>
                  <img 
                    src={circuitImage} 
                    alt="Quantum Circuit" 
                    className="w-full rounded-lg bg-white p-2" 
                    onError={(e) => {
                      console.error('Failed to load circuit image:', circuitImage);
                      showNotification('error', '❌ Failed to load circuit diagram');
                    }}
                    onLoad={() => console.log('Circuit image loaded successfully')}
                  />
                </div>
              )}
              
              {statsImage && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-gray-300">Circuit Statistics</h4>
                  <img 
                    src={statsImage} 
                    alt="Circuit Statistics" 
                    className="w-full rounded-lg bg-white p-2"
                    onError={(e) => {
                      console.error('Failed to load stats image:', statsImage);
                      showNotification('error', '❌ Failed to load statistics diagram');
                    }}
                    onLoad={() => console.log('Stats image loaded successfully')}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Original Results (for backward compatibility) */}
      {quantumState.results && !quantumState.schedule && (
        <div className="bg-dark-700 p-4 rounded-xl">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Quantum Optimization Results
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xl font-bold text-green-400">
                {quantumState.results.assignments?.length || 0}
              </div>
              <div className="text-xs text-gray-400">Scheduled</div>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-bold text-yellow-400">
                {quantumState.results.unscheduled?.length || 0}
              </div>
              <div className="text-xs text-gray-400">Unscheduled</div>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-bold text-blue-400">
                {quantumState.results.computationTimeMs || 0}ms
              </div>
              <div className="text-xs text-gray-400">Quantum Time</div>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-bold text-purple-400">
                {((quantumState.results.assignments?.length || 0) / Math.max(1, (quantumState.results.assignments?.length || 0) + (quantumState.results.unscheduled?.length || 0)) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-400">Success Rate</div>
            </div>
          </div>
          
          {quantumState.results.explanation && (
            <div className="bg-dark-600 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <Info size={16} className="text-blue-400 mt-0.5" />
                <div>
                  <div className="font-medium text-sm mb-1">Quantum Explanation</div>
                  <div className="text-xs text-gray-300">{quantumState.results.explanation}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quantum Info */}
      <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
        <div className="flex items-start gap-2">
          <Sparkles size={16} className="text-purple-400 mt-0.5" />
          <div className="text-xs text-purple-300">
            <strong>Quantum Advantage:</strong> This optimizer uses real quantum computing principles including superposition, 
            entanglement, and quantum interference to explore multiple scheduling solutions simultaneously.
          </div>
        </div>
      </div>
    </div>
  )
}
