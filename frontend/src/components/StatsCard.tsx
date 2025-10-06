'use client'

import { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  value: number | string
  icon: LucideIcon
  trend?: string
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'pink' | 'indigo'
  loading?: boolean
}

const colorClasses = {
  blue: 'from-blue-400 to-blue-600',
  green: 'from-green-400 to-green-600',
  yellow: 'from-yellow-400 to-yellow-600',
  purple: 'from-purple-400 to-purple-600',
  pink: 'from-pink-400 to-pink-600',
  indigo: 'from-indigo-400 to-indigo-600',
}

export default function StatsCard({ title, value, icon: Icon, trend, color = 'blue', loading }: Props) {
  const gradientClass = colorClasses[color]
  
  if (loading) {
    return (
      <div className="neumorphic-card p-6 animate-pulse">
        <div className="h-24 bg-dark-700 rounded-xl" />
      </div>
    )
  }
  
  return (
    <div className="neumorphic-card p-6 hover:scale-105 transition-transform duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-2">{title}</p>
          <p className="text-3xl font-bold mb-1">{value}</p>
          {trend && (
            <p className={`text-sm ${trend.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
              {trend} from last week
            </p>
          )}
        </div>
        
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
    </div>
  )
}
