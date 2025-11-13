'use client'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'card' | 'circle' | 'button' | 'avatar'
  width?: string
  height?: string
  count?: number
}

export default function Skeleton({ 
  className = '', 
  variant = 'text',
  width,
  height,
  count = 1
}: SkeletonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4 rounded'
      case 'card':
        return 'h-32 rounded-2xl'
      case 'circle':
        return 'rounded-full aspect-square'
      case 'button':
        return 'h-10 rounded-xl'
      case 'avatar':
        return 'w-12 h-12 rounded-full'
      default:
        return 'h-4 rounded'
    }
  }

  const style = {
    width: width || undefined,
    height: height || undefined,
  }

  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`skeleton ${getVariantClasses()} ${className}`}
      style={style}
    />
  ))

  return count > 1 ? (
    <div className="space-y-3">
      {skeletons}
    </div>
  ) : (
    skeletons[0]
  )
}

// Compound components for common patterns
export function SkeletonCard() {
  return (
    <div className="neumorphic-card p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="avatar" />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" />
          <Skeleton width="40%" />
        </div>
      </div>
      <Skeleton count={3} />
      <div className="flex gap-2">
        <Skeleton variant="button" width="100px" />
        <Skeleton variant="button" width="100px" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="neumorphic-card p-4 flex items-center gap-4">
          <Skeleton variant="circle" width="40px" height="40px" />
          <div className="flex-1 space-y-2">
            <Skeleton width="70%" />
            <Skeleton width="50%" />
          </div>
          <Skeleton variant="button" width="80px" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonKanban() {
  return (
    <div className="grid grid-cols-5 gap-4">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton variant="card" height="80px" />
          <Skeleton variant="card" height="120px" />
          <Skeleton variant="card" height="100px" />
        </div>
      ))}
    </div>
  )
}
