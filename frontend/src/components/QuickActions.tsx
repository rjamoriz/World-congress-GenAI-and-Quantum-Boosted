'use client'

import { useState } from 'react'
import { 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  User,
  FileText,
  Send,
  MoreVertical,
  Zap
} from 'lucide-react'
import { MeetingRequest, RequestStatus } from '@agenda-manager/shared'
import { useNotify } from '@/contexts/NotificationContext'

interface QuickActionsProps {
  request: MeetingRequest
  onAction: (action: string, data?: any) => void | Promise<void>
  compact?: boolean
}

export default function QuickActions({ request, onAction, compact = false }: QuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const notify = useNotify()

  const handleAction = async (actionType: string, actionData?: any) => {
    setLoading(actionType)
    setIsOpen(false)
    try {
      await onAction(actionType, actionData)
    } catch (error) {
      console.error(`Action ${actionType} failed:`, error)
    } finally {
      setLoading(null)
    }
  }

  // Determine available actions based on current status
  const getAvailableActions = () => {
    const actions = []

    switch (request.status) {
      case RequestStatus.PENDING:
        actions.push(
          {
            id: 'qualify',
            label: 'Quick Qualify',
            icon: Sparkles,
            color: 'text-green-400',
            hoverColor: 'hover:bg-green-500/20',
            description: 'Auto-qualify with AI',
            action: () => handleAction('qualify')
          },
          {
            id: 'reject',
            label: 'Quick Reject',
            icon: XCircle,
            color: 'text-red-400',
            hoverColor: 'hover:bg-red-500/20',
            description: 'Reject with AI reason',
            action: () => handleAction('reject')
          }
        )
        break

      case RequestStatus.QUALIFIED:
        actions.push(
          {
            id: 'auto-schedule',
            label: 'Auto Schedule',
            icon: Calendar,
            color: 'text-blue-400',
            hoverColor: 'hover:bg-blue-500/20',
            description: 'Find best host & time',
            action: () => handleAction('auto-schedule')
          },
          {
            id: 'assign-host',
            label: 'Assign Host',
            icon: User,
            color: 'text-purple-400',
            hoverColor: 'hover:bg-purple-500/20',
            description: 'Pick best available host',
            action: () => handleAction('assign-host')
          }
        )
        break

      case RequestStatus.SCHEDULED:
        actions.push(
          {
            id: 'generate-materials',
            label: 'Generate Materials',
            icon: FileText,
            color: 'text-yellow-400',
            hoverColor: 'hover:bg-yellow-500/20',
            description: 'AI-generated prep docs',
            action: () => handleAction('generate-materials')
          },
          {
            id: 'send-confirmation',
            label: 'Send Confirmation',
            icon: Send,
            color: 'text-green-400',
            hoverColor: 'hover:bg-green-500/20',
            description: 'Email meeting details',
            action: () => handleAction('send-confirmation')
          }
        )
        break

      case RequestStatus.COMPLETED:
        actions.push(
          {
            id: 'send-followup',
            label: 'Send Follow-up',
            icon: Send,
            color: 'text-blue-400',
            hoverColor: 'hover:bg-blue-500/20',
            description: 'AI-generated follow-up',
            action: () => handleAction('send-followup')
          }
        )
        break
    }

    // Always available actions
    actions.push(
      {
        id: 'view-details',
        label: 'View Details',
        icon: FileText,
        color: 'text-gray-400',
        hoverColor: 'hover:bg-gray-500/20',
        description: 'Open full details',
        action: () => handleAction('view-details')
      }
    )

    return actions
  }

  const actions = getAvailableActions()
  const primaryAction = actions[0]

  if (compact) {
    // Compact mode: Show only icon button that opens menu
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Quick actions"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <MoreVertical className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 top-10 w-56 z-50 neumorphic-card p-2 space-y-1">
              {actions.map(action => (
                <button
                  key={action.id}
                  onClick={action.action}
                  disabled={loading === action.id}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg
                    transition-colors text-left
                    ${action.hoverColor}
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <action.icon className={`w-4 h-4 ${action.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-white">
                      {action.label}
                    </div>
                    <div className="text-xs text-gray-400">
                      {action.description}
                    </div>
                  </div>
                  {loading === action.id && (
                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // Full mode: Show primary action button + menu
  return (
    <div className="flex items-center gap-2">
      {/* Primary action button */}
      {primaryAction && (
        <button
          onClick={primaryAction.action}
          disabled={loading === primaryAction.id}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg
            bg-primary-500 hover:bg-primary-600
            text-white font-medium text-sm
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            shadow-lg hover:shadow-xl
          `}
        >
          {loading === primaryAction.id ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <primaryAction.icon className="w-4 h-4" />
          )}
          {primaryAction.label}
        </button>
      )}

      {/* More actions menu */}
      {actions.length > 1 && (
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="More actions"
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>

          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute right-0 top-10 w-56 z-50 neumorphic-card p-2 space-y-1">
                {actions.slice(1).map(action => (
                  <button
                    key={action.id}
                    onClick={action.action}
                    disabled={loading === action.id}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg
                      transition-colors text-left
                      ${action.hoverColor}
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <action.icon className={`w-4 h-4 ${action.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-white">
                        {action.label}
                      </div>
                      <div className="text-xs text-gray-400">
                        {action.description}
                      </div>
                    </div>
                    {loading === action.id && (
                      <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
