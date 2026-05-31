import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Athlete Tracker',
  description: 'Personal athlete tracking app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100`}>
        <Navigation />
        <main className="md:ml-48 pb-20 md:pb-0 min-h-screen">
          <div className="max-w-4xl mx-auto p-4 md:p-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
