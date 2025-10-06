'use client'

import { ReactNode } from 'react'
import { Calendar, Users, Settings, BarChart3, Sparkles, Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  children: ReactNode
}

export default function DashboardLayout({ children }: Props) {
  const pathname = usePathname()
  
  const navItems = [
    { href: '/', icon: BarChart3, label: 'Dashboard' },
    { href: '/requests', icon: Calendar, label: 'Requests' },
    { href: '/hosts', icon: Users, label: 'Hosts' },
    { href: '/schedule', icon: Sparkles, label: 'Schedule' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]
  
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 neumorphic-card m-4 p-6 h-[calc(100vh-2rem)] sticky top-4">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
                <Sparkles className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold">Agenda AI</h1>
                <p className="text-xs text-gray-500">World Congress</p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-primary-500 text-white shadow-lg' 
                      : 'text-gray-400 hover:text-gray-200 hover:bg-dark-700'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>
          
          {/* User Info */}
          <div className="mt-auto pt-6 border-t border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-gray-500">admin@worldcongress.com</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
