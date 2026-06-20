import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Tavola CRM',
  description: 'CRM for HORECA businesses — Hotels, Restaurants, Cafes',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={geist.variable}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
