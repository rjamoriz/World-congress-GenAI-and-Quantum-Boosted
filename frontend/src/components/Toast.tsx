'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { ToastNotification, NotificationType } from '@agenda-manager/shared'

interface ToastProps {
  toast: ToastNotification
  onDismiss: (id: string) => void
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Trigger exit animation before actual removal
    if (toast.duration && toast.duration > 0) {
      const exitTimer = setTimeout(() => {
        setIsExiting(true)
      }, toast.duration - 300)
      
      return () => clearTimeout(exitTimer)
    }
  }, [toast.duration])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss(toast.id)
    }, 300)
  }

  const getIcon = () => {
    switch (toast.type) {
      case NotificationType.SUCCESS:
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case NotificationType.ERROR:
        return <XCircle className="w-5 h-5 text-red-400" />
      case NotificationType.WARNING:
        return <AlertCircle className="w-5 h-5 text-yellow-400" />
      case NotificationType.INFO:
        return <Info className="w-5 h-5 text-blue-400" />
    }
  }

  const getColors = () => {
    switch (toast.type) {
      case NotificationType.SUCCESS:
        return 'border-green-500/20 bg-green-950/50'
      case NotificationType.ERROR:
        return 'border-red-500/20 bg-red-950/50'
      case NotificationType.WARNING:
        return 'border-yellow-500/20 bg-yellow-950/50'
      case NotificationType.INFO:
        return 'border-blue-500/20 bg-blue-950/50'
    }
  }

  return (
    <div
      className={`
        relative flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm
        ${getColors()}
        transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-full scale-95' : 'opacity-100 translate-x-0 scale-100'}
        shadow-lg hover:shadow-xl
        min-w-[320px] max-w-md
      `}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-white text-sm mb-1">
          {toast.title}
        </h4>
        <p className="text-gray-300 text-sm leading-relaxed">
          {toast.message}
        </p>
        
        {/* Action button if provided */}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            {toast.action.label} →
          </button>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar for timed notifications */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-white/30"
            style={{
              animation: `shrink ${toast.duration}ms linear forwards`
            }}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  )
}
