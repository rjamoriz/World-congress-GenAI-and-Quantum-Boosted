'use client'

import { useState } from 'react'
import { 
  CheckSquare, 
  Square,
  Sparkles,
  XCircle,
  Calendar,
  Trash2,
  X
} from 'lucide-react'
import { MeetingRequest, RequestStatus } from '@agenda-manager/shared'
import { useNotify } from '@/contexts/NotificationContext'

interface BulkActionsProps {
  requests: MeetingRequest[]
  onBulkAction: (action: string, requestIds: string[]) => Promise<void>
}

export default function BulkActions({ requests, onBulkAction }: BulkActionsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const notify = useNotify()

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === requests.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(requests.map(r => r.id)))
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleBulkAction = async (action: string) => {
    if (selectedIds.size === 0) {
      notify.warning('No Selection', 'Please select requests first')
      return
    }

    setLoading(true)
    try {
      await onBulkAction(action, Array.from(selectedIds))
      notify.success(
        'Bulk Action Complete',
        `Applied ${action} to ${selectedIds.size} request(s)`
      )
      clearSelection()
    } catch (error) {
      notify.error('Bulk Action Failed', 'Could not complete bulk action')
    } finally {
      setLoading(false)
    }
  }

  const selectedCount = selectedIds.size
  const allSelected = selectedCount === requests.length && requests.length > 0

  // Don't show bulk actions if no requests
  if (requests.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Selection bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          {allSelected ? (
            <CheckSquare className="w-4 h-4 text-primary-400" />
          ) : (
            <Square className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm text-gray-300">
            {allSelected ? 'Deselect All' : 'Select All'}
          </span>
        </button>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium text-primary-400">
              {selectedCount} selected
            </span>
            <button
              onClick={clearSelection}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              aria-label="Clear selection"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        )}
      </div>

      {/* Bulk action buttons */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
          <span className="text-sm text-gray-400 mr-2">Bulk Actions:</span>
          
          <button
            onClick={() => handleBulkAction('qualify')}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Qualify All
          </button>

          <button
            onClick={() => handleBulkAction('reject')}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            Reject All
          </button>

          <button
            onClick={() => handleBulkAction('schedule')}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Calendar className="w-3.5 h-3.5" />
            Schedule All
          </button>

          <button
            onClick={() => handleBulkAction('delete')}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-500/20 hover:bg-red-500/30 text-gray-400 hover:text-red-400 text-sm font-medium transition-colors disabled:opacity-50 ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>

          {loading && (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin ml-2" />
          )}
        </div>
      )}

      {/* Hidden checkboxes for each request (to be used by parent component) */}
      <div className="hidden">
        {requests.map(request => (
          <input
            key={request.id}
            type="checkbox"
            checked={selectedIds.has(request.id)}
            onChange={() => toggleSelection(request.id)}
            data-request-id={request.id}
          />
        ))}
      </div>
    </div>
  )
}

// Export helper hook for parent components
export function useBulkSelection(requests: MeetingRequest[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const isSelected = (id: string) => selectedIds.has(id)

  const clearSelection = () => setSelectedIds(new Set())

  const selectAll = () => setSelectedIds(new Set(requests.map(r => r.id)))

  return {
    selectedIds: Array.from(selectedIds),
    isSelected,
    toggleSelection,
    clearSelection,
    selectAll,
    selectedCount: selectedIds.size
  }
}
