'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Notification, ToastNotification, NotificationType, NotificationAction } from '@agenda-manager/shared'

interface NotificationContextValue {
  // Toast notifications (temporary, auto-dismiss)
  toasts: ToastNotification[]
  showToast: (toast: Omit<ToastNotification, 'id'>) => void
  dismissToast: (id: string) => void
  
  // Persistent notifications (notification center)
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  clearAll: () => void
  unreadCount: number
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastNotification[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Toast management
  const showToast = useCallback((toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToast: ToastNotification = {
      id,
      ...toast,
      duration: toast.duration ?? 5000
    }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto-dismiss after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        dismissToast(id)
      }, newToast.duration)
    }
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  // Notification center management
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newNotification: Notification = {
      id,
      timestamp: new Date(),
      read: false,
      ...notification
    }
    
    setNotifications(prev => [newNotification, ...prev])
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })))
  }, [])

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        unreadCount
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}

// Helper hook for common notification patterns
export function useNotify() {
  const { showToast, addNotification } = useNotifications()

  return {
    success: (title: string, message: string, persistent = false) => {
      showToast({ type: NotificationType.SUCCESS, title, message })
      if (persistent) {
        addNotification({
          type: NotificationType.SUCCESS,
          action: NotificationAction.SYSTEM_ERROR, // Generic action
          title,
          message
        })
      }
    },
    
    error: (title: string, message: string, persistent = true) => {
      showToast({ type: NotificationType.ERROR, title, message, duration: 7000 })
      if (persistent) {
        addNotification({
          type: NotificationType.ERROR,
          action: NotificationAction.SYSTEM_ERROR,
          title,
          message
        })
      }
    },
    
    warning: (title: string, message: string, persistent = false) => {
      showToast({ type: NotificationType.WARNING, title, message, duration: 6000 })
      if (persistent) {
        addNotification({
          type: NotificationType.WARNING,
          action: NotificationAction.SYSTEM_ERROR,
          title,
          message
        })
      }
    },
    
    info: (title: string, message: string, persistent = false) => {
      showToast({ type: NotificationType.INFO, title, message })
      if (persistent) {
        addNotification({
          type: NotificationType.INFO,
          action: NotificationAction.SYSTEM_ERROR,
          title,
          message
        })
      }
    },
    
    // Specific action notifications
    requestCreated: (company: string) => {
      showToast({
        type: NotificationType.SUCCESS,
        title: 'Request Created',
        message: `Meeting request from ${company} has been created`
      })
      addNotification({
        type: NotificationType.SUCCESS,
        action: NotificationAction.REQUEST_CREATED,
        title: 'New Request',
        message: `Meeting request from ${company}`
      })
    },
    
    requestQualified: (company: string, score: number) => {
      showToast({
        type: NotificationType.SUCCESS,
        title: 'Request Qualified',
        message: `${company} qualified with score ${score}%`
      })
      addNotification({
        type: NotificationType.SUCCESS,
        action: NotificationAction.REQUEST_QUALIFIED,
        title: 'Request Qualified',
        message: `${company} - Score: ${score}%`
      })
    },
    
    requestScheduled: (company: string, host: string) => {
      showToast({
        type: NotificationType.SUCCESS,
        title: 'Meeting Scheduled',
        message: `${company} scheduled with ${host}`
      })
      addNotification({
        type: NotificationType.SUCCESS,
        action: NotificationAction.REQUEST_SCHEDULED,
        title: 'Meeting Scheduled',
        message: `${company} ↔ ${host}`
      })
    },
    
    quantumComplete: (duration: number) => {
      showToast({
        type: NotificationType.INFO,
        title: 'Quantum Optimization Complete',
        message: `Schedule optimized in ${duration.toFixed(1)}s`
      })
      addNotification({
        type: NotificationType.INFO,
        action: NotificationAction.QUANTUM_COMPLETE,
        title: 'Quantum Optimization',
        message: `Completed in ${duration.toFixed(1)}s`
      })
    }
  }
}
