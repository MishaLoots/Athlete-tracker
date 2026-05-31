'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '⊞' },
  { href: '/log', label: 'Log', icon: '✎' },
  { href: '/nutrition', label: 'Nutrition', icon: '◉' },
  { href: '/trends', label: 'Trends', icon: '↗' },
  { href: '/training', label: 'Training', icon: '⚡' },
  { href: '/goals', label: 'Goals', icon: '◎' },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop side nav */}
      <nav className="hidden md:flex flex-col w-48 min-h-screen bg-gray-900 border-r border-gray-800 p-4 fixed left-0 top-0">
        <div className="mb-8 mt-2">
          <span className="text-[#1D9E75] font-bold text-lg">🚴 Misha</span>
        </div>
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  pathname === item.href
                    ? 'bg-[#1D9E75]/20 text-[#1D9E75] font-medium'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50">
        <ul className="flex justify-around">
          {navItems.map((item) => (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center py-2 text-xs transition-colors ${
                  pathname === item.href
                    ? 'text-[#1D9E75]'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <span className="text-lg leading-none mb-0.5">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
