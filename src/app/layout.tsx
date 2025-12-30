import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DealFindrs | AI-Powered Project Assessment',
  description: 'The AI-powered platform that gives property development promoters instant Green/Amber/Red assessments on every opportunity.',
  keywords: ['property development', 'deal assessment', 'investment', 'real estate', 'AI'],
  authors: [{ name: 'Factory2Key' }],
  openGraph: {
    title: 'DealFindrs | AI-Powered Project Assessment',
    description: 'Stop Guessing. Start Knowing. AI-powered deal assessment for property developers.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  )
}
