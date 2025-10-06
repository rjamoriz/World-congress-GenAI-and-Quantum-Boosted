'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Volume2, MessageCircle, Zap, Settings, Phone, PhoneOff, Send } from 'lucide-react'
import { apiClient } from '@/lib/api'

interface VoiceChatState {
  isRecording: boolean
  isProcessing: boolean
  conversation: Array<{
    id: string
    type: 'user' | 'assistant'
    content: string
    timestamp: Date
    action?: string
  }>
}

export default function VoiceChatSimple() {
  const [voiceState, setVoiceState] = useState<VoiceChatState>({
    isRecording: false,
    isProcessing: false,
    conversation: []
  })
  
  const [textInput, setTextInput] = useState('')
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  const addToConversation = (type: 'user' | 'assistant', content: string, action?: string) => {
    const newMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      action
    }
    
    setVoiceState(prev => ({
      ...prev,
      conversation: [...prev.conversation, newMessage]
    }))
  }

  const processVoiceCommand = async (text: string) => {
    try {
      setVoiceState(prev => ({ ...prev, isProcessing: true }))
      
      // Send to voice command processor
      const response = await apiClient.post('/voice/command', {
        command: text,
        context: {
          timestamp: new Date().toISOString(),
          conversationLength: voiceState.conversation.length
        }
      })
      
      const result = response.data
      
      // Add assistant response
      addToConversation('assistant', result.response, result.action)
      
      // Execute action if needed
      if (result.success && result.action) {
        await executeAction(result.action, result.parameters)
      }
      
      // Speak the response
      await speakText(result.response)
      
    } catch (error: any) {
      console.error('Voice command processing failed:', error)
      const errorMessage = 'Sorry, I had trouble processing that command.'
      addToConversation('assistant', errorMessage)
      await speakText(errorMessage)
      showNotification('error', '❌ Command processing failed')
    } finally {
      setVoiceState(prev => ({ ...prev, isProcessing: false }))
    }
  }

  const executeAction = async (action: string, parameters: any) => {
    try {
      switch (action) {
        case 'schedule_optimization':
          showNotification('info', `🚀 Running ${parameters.algorithm} optimization...`)
          
          const optimizationResponse = await apiClient.post('/schedule/optimize', {
            algorithm: parameters.algorithm,
            constraints: {
              eventStartDate: new Date().toISOString().split('T')[0],
              eventEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }
          })
          
          const scheduled = optimizationResponse.data.data?.assignments?.length || 0
          const successMessage = `✅ Optimization complete! Scheduled ${scheduled} meetings using ${parameters.algorithm} algorithm.`
          
          addToConversation('assistant', successMessage)
          showNotification('success', successMessage)
          await speakText(`Optimization complete. Successfully scheduled ${scheduled} meetings.`)
          break
          
        case 'get_system_status':
          const statusResponse = await apiClient.get('/health')
          const status = statusResponse.data
          
          const statusMessage = `System Status: ${status.status}. Database: ${status.database ? 'Connected' : 'Disconnected'}. Redis: ${status.redis ? 'Connected' : 'Disconnected'}.`
          
          addToConversation('assistant', statusMessage)
          await speakText(statusMessage)
          break
          
        default:
          console.log('Unknown action:', action)
      }
    } catch (error) {
      console.error('Action execution failed:', error)
      const errorMessage = 'I encountered an error while executing that action.'
      addToConversation('assistant', errorMessage)
      await speakText(errorMessage)
    }
  }

  const speakText = async (text: string) => {
    try {
      const response = await apiClient.post('/voice/tts', {
        text,
        voice: 'alloy',
        model: 'tts-1'
      }, {
        responseType: 'blob'
      })
      
      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      
      audio.play()
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
      }
      
    } catch (error) {
      console.error('Text-to-speech failed:', error)
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
      audioChunksRef.current = []
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processAudioRecording(audioBlob)
      }
      
      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      
      setVoiceState(prev => ({ ...prev, isRecording: true }))
      showNotification('info', '🎤 Recording... Click again to stop')
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      showNotification('error', '❌ Failed to access microphone')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && voiceState.isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    setVoiceState(prev => ({ ...prev, isRecording: false }))
    showNotification('info', '🔄 Processing audio...')
  }

  const processAudioRecording = async (audioBlob: Blob) => {
    try {
      setVoiceState(prev => ({ ...prev, isProcessing: true }))
      
      // Convert to base64
      const arrayBuffer = await audioBlob.arrayBuffer()
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      
      // Send to speech-to-text
      const sttResponse = await apiClient.post('/voice/stt', {
        audio: base64Audio,
        model: 'whisper-1'
      })
      
      const transcription = sttResponse.data.text
      
      if (transcription && transcription.trim()) {
        // Add user message
        addToConversation('user', transcription)
        
        // Process the command
        await processVoiceCommand(transcription)
      } else {
        showNotification('error', '❌ Could not understand audio')
      }
      
    } catch (error: any) {
      console.error('Audio processing failed:', error)
      showNotification('error', '❌ Audio processing failed')
      addToConversation('assistant', 'Sorry, I had trouble understanding that audio.')
    } finally {
      setVoiceState(prev => ({ ...prev, isProcessing: false }))
    }
  }

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!textInput.trim()) return
    
    const text = textInput.trim()
    setTextInput('')
    
    // Add user message
    addToConversation('user', text)
    
    // Process the command
    await processVoiceCommand(text)
  }

  const toggleRecording = () => {
    if (voiceState.isRecording) {
      stopRecording()
    } else {
      startRecording()
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
            <h3 className="text-xl font-semibold">AI Voice Assistant</h3>
            <p className="text-sm text-gray-400">
              Voice-powered agenda management with OpenAI
            </p>
          </div>
        </div>
      </div>

      {/* Voice Controls */}
      <div className="mb-6 flex justify-center gap-4">
        <button
          onClick={toggleRecording}
          disabled={voiceState.isProcessing}
          className={`neumorphic-button p-4 ${
            voiceState.isRecording 
              ? 'text-red-400 bg-red-500/10 border-red-500/30' 
              : 'text-green-400'
          } disabled:opacity-50`}
        >
          {voiceState.isRecording ? <MicOff size={32} /> : <Mic size={32} />}
        </button>
        
        <button
          onClick={() => speakText('Voice assistant is ready. How can I help you today?')}
          disabled={voiceState.isProcessing}
          className="neumorphic-button p-4 text-blue-400 disabled:opacity-50"
        >
          <Volume2 size={32} />
        </button>
      </div>

      {/* Text Input */}
      <form onSubmit={handleTextSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type a command or question..."
            className="flex-1 neumorphic-input py-3 px-4"
            disabled={voiceState.isProcessing}
          />
          <button
            type="submit"
            disabled={!textInput.trim() || voiceState.isProcessing}
            className="neumorphic-button px-4 text-blue-400 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </form>

      {/* Status Indicators */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-dark-700 p-3 rounded-xl text-center">
          <div className={`text-lg font-bold ${voiceState.isRecording ? 'text-red-400' : 'text-gray-400'}`}>
            {voiceState.isRecording ? 'REC' : 'IDLE'}
          </div>
          <div className="text-xs text-gray-400">Microphone</div>
        </div>
        
        <div className="bg-dark-700 p-3 rounded-xl text-center">
          <div className={`text-lg font-bold ${voiceState.isProcessing ? 'text-yellow-400' : 'text-gray-400'}`}>
            {voiceState.isProcessing ? 'PROC' : 'READY'}
          </div>
          <div className="text-xs text-gray-400">Processing</div>
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
            <p className="text-sm">Try saying "Run quantum optimization" or "Show system status"</p>
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
                  <span className="font-medium text-sm flex items-center gap-2">
                    {message.type === 'user' ? '👤 You' : '🤖 Assistant'}
                    {message.action && (
                      <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                        {message.action}
                      </span>
                    )}
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

      {/* Voice Commands Info */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-2">
          <Zap size={16} className="text-blue-400 mt-0.5" />
          <div className="text-xs text-blue-300">
            <strong>Try these commands:</strong> "Run quantum optimization", "Show system status", 
            "Schedule a meeting", "What can you do?", "Help me with scheduling"
          </div>
        </div>
      </div>
    </div>
  )
}
