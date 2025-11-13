'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, Zap, Settings, Phone, PhoneOff } from 'lucide-react'

interface VoiceChatState {
  isConnected: boolean
  isRecording: boolean
  isPlaying: boolean
  isMuted: boolean
  conversation: Array<{
    id: string
    type: 'user' | 'assistant'
    content: string
    timestamp: Date
    audioUrl?: string
  }>
}

export default function VoiceChat() {
  const [voiceState, setVoiceState] = useState<VoiceChatState>({
    isConnected: false,
    isRecording: false,
    isPlaying: false,
    isMuted: false,
    conversation: []
  })
  
  const [config, setConfig] = useState({
    model: 'gpt-4o-realtime-preview-2024-12-17',
    voice: 'alloy',
    temperature: 0.7,
    maxTokens: 4096
  })
  
  const [showConfig, setShowConfig] = useState(false)
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  const connectToOpenAI = async () => {
    try {
      setVoiceState(prev => ({ ...prev, isConnected: true }))
      
      // Connect through backend WebSocket proxy (secure - API key on server)
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const wsUrl = backendUrl.replace('http:', 'ws:').replace('https:', 'wss:');
      const wsEndpoint = `${wsUrl}/api/voice/realtime-ws?model=${config.model}&voice=${config.voice}&temperature=${config.temperature}`;
      
      const ws = new WebSocket(wsEndpoint);
      
      ws.onopen = () => {
        showNotification('success', '🎤 Connected to OpenAI Realtime API via secure proxy')
      }
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        handleRealtimeMessage(data)
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        showNotification('error', '❌ Connection error')
        setVoiceState(prev => ({ ...prev, isConnected: false }))
      }
      
      ws.onclose = () => {
        showNotification('info', '📞 Disconnected from voice chat')
        setVoiceState(prev => ({ ...prev, isConnected: false, isRecording: false }))
      }
      
      wsRef.current = ws
      
    } catch (error) {
      console.error('Failed to connect:', error)
      showNotification('error', '❌ Failed to connect to Realtime API')
      setVoiceState(prev => ({ ...prev, isConnected: false }))
    }
  }

  const handleRealtimeMessage = (data: any) => {
    switch (data.type) {
      case 'conversation.item.created':
        if (data.item.type === 'message') {
          addToConversation(
            data.item.role === 'user' ? 'user' : 'assistant',
            data.item.content?.[0]?.text || data.item.content?.[0]?.transcript || 'Audio message'
          )
        }
        break
        
      case 'response.audio.delta':
        // Handle streaming audio response
        if (data.delta) {
          playAudioChunk(data.delta)
        }
        break
        
      case 'response.audio.done':
        setVoiceState(prev => ({ ...prev, isPlaying: false }))
        break
        
      case 'input_audio_buffer.speech_started':
        setVoiceState(prev => ({ ...prev, isRecording: true }))
        break
        
      case 'input_audio_buffer.speech_stopped':
        setVoiceState(prev => ({ ...prev, isRecording: false }))
        break
        
      case 'response.function_call_delta':
        // Handle function calls (like scheduling optimization)
        if (data.name === 'schedule_optimization') {
          handleScheduleOptimization(JSON.parse(data.arguments))
        }
        break
        
      case 'error':
        console.error('Realtime API error:', data.error)
        showNotification('error', `❌ ${data.error.message}`)
        break
    }
  }

  const addToConversation = (type: 'user' | 'assistant', content: string) => {
    const newMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    }
    
    setVoiceState(prev => ({
      ...prev,
      conversation: [...prev.conversation, newMessage]
    }))
  }

  const playAudioChunk = async (audioData: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }
      
      // Decode base64 audio data
      const binaryData = atob(audioData)
      const arrayBuffer = new ArrayBuffer(binaryData.length)
      const uint8Array = new Uint8Array(arrayBuffer)
      
      for (let i = 0; i < binaryData.length; i++) {
        uint8Array[i] = binaryData.charCodeAt(i)
      }
      
      // Play audio chunk
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      source.start()
      
      setVoiceState(prev => ({ ...prev, isPlaying: true }))
      
    } catch (error) {
      console.error('Error playing audio:', error)
    }
  }

  const handleScheduleOptimization = async (args: any) => {
    try {
      showNotification('info', `🚀 Running ${args.algorithm} optimization...`)
      
      // Call your existing optimization API
      const response = await fetch('/api/schedule/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          algorithm: args.algorithm,
          constraints: {
            eventStartDate: new Date().toISOString().split('T')[0],
            eventEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        })
      })
      
      const result = await response.json()
      
      // Send result back to voice assistant
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: Date.now().toString(),
            output: JSON.stringify({
              success: true,
              scheduled: result.data?.assignments?.length || 0,
              algorithm: args.algorithm,
              message: `Successfully scheduled ${result.data?.assignments?.length || 0} meetings using ${args.algorithm} optimization.`
            })
          }
        }))
      }
      
      showNotification('success', `✅ Optimization complete: ${result.data?.assignments?.length || 0} meetings scheduled`)
      
    } catch (error) {
      console.error('Optimization failed:', error)
      showNotification('error', '❌ Optimization failed')
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })
      
      streamRef.current = stream
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=pcm'
      })
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current) {
          // Convert to PCM16 and send to OpenAI
          const reader = new FileReader()
          reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
            
            wsRef.current?.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: base64Audio
            }))
          }
          reader.readAsArrayBuffer(event.data)
        }
      }
      
      mediaRecorder.start(100) // Send chunks every 100ms
      mediaRecorderRef.current = mediaRecorder
      
      setVoiceState(prev => ({ ...prev, isRecording: true }))
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      showNotification('error', '❌ Failed to access microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    setVoiceState(prev => ({ ...prev, isRecording: false }))
    
    // Commit audio buffer
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
      }))
    }
  }

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    stopRecording()
    setVoiceState(prev => ({ 
      ...prev, 
      isConnected: false, 
      isRecording: false, 
      isPlaying: false 
    }))
  }

  const toggleMute = () => {
    setVoiceState(prev => ({ ...prev, isMuted: !prev.isMuted }))
    
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = voiceState.isMuted
      })
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
          <MessageCircle className="text-blue-400" size={32} />
          <div>
            <h3 className="text-xl font-semibold">OpenAI Realtime Voice Chat</h3>
            <p className="text-sm text-gray-400">
              {voiceState.isConnected ? '🟢 Connected' : '🔴 Disconnected'} • Voice-powered agenda management
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="neumorphic-button text-gray-400 p-2"
          >
            <Settings size={20} />
          </button>
          
          {voiceState.isConnected ? (
            <button
              onClick={disconnect}
              className="neumorphic-button text-red-400 font-semibold px-4 py-2"
            >
              <span className="flex items-center gap-2">
                <PhoneOff size={20} />
                Disconnect
              </span>
            </button>
          ) : (
            <button
              onClick={connectToOpenAI}
              className="neumorphic-button text-blue-400 font-semibold px-4 py-2"
            >
              <span className="flex items-center gap-2">
                <Phone size={20} />
                Connect
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
            Voice Configuration
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Voice Model</label>
              <select
                value={config.model}
                onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
                className="neumorphic-input py-2 px-3 w-full"
              >
                <option value="gpt-4o-realtime-preview-2024-12-17">GPT-4o Realtime (Dec 2024)</option>
                <option value="gpt-4o-realtime-preview-2024-10-01">GPT-4o Realtime (Oct 2024)</option>
                <option value="gpt-realtime-2025-08-28">GPT-5 Realtime (Latest)</option>
                <option value="gpt-realtime-mini-2025-10-06">GPT-5 Realtime Mini</option>
                <option value="gpt-4o-mini-realtime-preview-2024-12-17">GPT-4o Mini Realtime</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Voice</label>
              <select
                value={config.voice}
                onChange={(e) => setConfig(prev => ({ ...prev, voice: e.target.value }))}
                className="neumorphic-input py-2 px-3 w-full"
              >
                <option value="alloy">Alloy</option>
                <option value="echo">Echo</option>
                <option value="fable">Fable</option>
                <option value="onyx">Onyx</option>
                <option value="nova">Nova</option>
                <option value="shimmer">Shimmer</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Temperature</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{config.temperature}</span>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Max Tokens</label>
              <input
                type="number"
                value={config.maxTokens}
                onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                className="neumorphic-input py-2 px-3 w-full"
                min="100"
                max="16000"
                step="100"
              />
            </div>
          </div>
        </div>
      )}

      {/* Voice Controls */}
      {voiceState.isConnected && (
        <div className="mb-6 flex justify-center gap-4">
          <button
            onClick={voiceState.isRecording ? stopRecording : startRecording}
            className={`neumorphic-button p-4 ${
              voiceState.isRecording 
                ? 'text-red-400 bg-red-500/10 border-red-500/30' 
                : 'text-green-400'
            }`}
          >
            {voiceState.isRecording ? <MicOff size={32} /> : <Mic size={32} />}
          </button>
          
          <button
            onClick={toggleMute}
            className={`neumorphic-button p-4 ${
              voiceState.isMuted 
                ? 'text-red-400 bg-red-500/10 border-red-500/30' 
                : 'text-blue-400'
            }`}
          >
            {voiceState.isMuted ? <VolumeX size={32} /> : <Volume2 size={32} />}
          </button>
        </div>
      )}

      {/* Status Indicators */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-700 p-3 rounded-xl text-center">
          <div className={`text-lg font-bold ${voiceState.isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {voiceState.isConnected ? 'ONLINE' : 'OFFLINE'}
          </div>
          <div className="text-xs text-gray-400">Connection</div>
        </div>
        
        <div className="bg-dark-700 p-3 rounded-xl text-center">
          <div className={`text-lg font-bold ${voiceState.isRecording ? 'text-red-400' : 'text-gray-400'}`}>
            {voiceState.isRecording ? 'REC' : 'IDLE'}
          </div>
          <div className="text-xs text-gray-400">Microphone</div>
        </div>
        
        <div className="bg-dark-700 p-3 rounded-xl text-center">
          <div className={`text-lg font-bold ${voiceState.isPlaying ? 'text-blue-400' : 'text-gray-400'}`}>
            {voiceState.isPlaying ? 'PLAY' : 'QUIET'}
          </div>
          <div className="text-xs text-gray-400">Speaker</div>
        </div>
        
        <div className="bg-dark-700 p-3 rounded-xl text-center">
          <div className="text-lg font-bold text-purple-400">
            {voiceState.conversation.length}
          </div>
          <div className="text-xs text-gray-400">Messages</div>
        </div>
      </div>

      {/* Conversation History */}
      <div className="bg-dark-700 p-4 rounded-xl max-h-64 overflow-y-auto">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <MessageCircle size={20} />
          Conversation History
        </h4>
        
        {voiceState.conversation.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
            <p>No conversation yet</p>
            <p className="text-sm">Connect and start talking to begin</p>
          </div>
        ) : (
          <div className="space-y-3">
            {voiceState.conversation.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-lg ${
                  message.type === 'user' 
                    ? 'bg-blue-500/20 border-l-4 border-blue-400' 
                    : 'bg-green-500/20 border-l-4 border-green-400'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-sm">
                    {message.type === 'user' ? '👤 You' : '🤖 Assistant'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm">{message.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Voice Chat Info */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-2">
          <Zap size={16} className="text-blue-400 mt-0.5" />
          <div className="text-xs text-blue-300">
            <strong>Voice Commands:</strong> Try saying "Run quantum optimization", "Show system status", 
            "Schedule a meeting", or "What's the current schedule?" for intelligent voice-powered management.
          </div>
        </div>
      </div>
    </div>
  )
}
