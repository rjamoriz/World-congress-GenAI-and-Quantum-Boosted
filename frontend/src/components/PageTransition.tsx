'use client'

import { useEffect, useState } from 'react'

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

export default function PageTransition({ children, className = '' }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation on mount
    setIsVisible(true)
  }, [])

  return (
    <div 
      className={`page-transition ${isVisible ? 'opacity-100' : 'opacity-0'} ${className}`}
      style={{ transition: 'opacity 0.4s ease-out, transform 0.4s ease-out' }}
    >
      {children}
    </div>
  )
}

// Fade in variant
export function FadeIn({ children, delay = 0, className = '' }: PageTransitionProps & { delay?: number }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div 
      className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${className}`}
    >
      {children}
    </div>
  )
}

// Slide in from left
export function SlideInLeft({ children, delay = 0, className = '' }: PageTransitionProps & { delay?: number }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div 
      className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'} ${className}`}
    >
      {children}
    </div>
  )
}

// Scale in
export function ScaleIn({ children, delay = 0, className = '' }: PageTransitionProps & { delay?: number }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div 
      className={`transition-all duration-500 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} ${className}`}
    >
      {children}
    </div>
  )
}

// Stagger children animation
export function StaggerChildren({ 
  children, 
  staggerDelay = 50,
  className = '' 
}: { 
  children: React.ReactNode[]
  staggerDelay?: number
  className?: string 
}) {
  return (
    <div className={className}>
      {Array.isArray(children) && children.map((child, index) => (
        <FadeIn key={index} delay={index * staggerDelay}>
          {child}
        </FadeIn>
      ))}
    </div>
  )
}
