import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { Providers } from '@/lib/providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'EcoRal — Environmental Intelligence Platform',
  description: 'AI-powered coral bleaching risk prediction and environmental intelligence platform for ocean conservation.',
  keywords: ['coral bleaching', 'environmental intelligence', 'reef conservation', 'AI prediction', 'ocean health', 'EcoRal'],
  openGraph: {
    title: 'EcoRal — Environmental Intelligence Platform',
    description: 'AI-powered coral bleaching risk prediction and environmental intelligence platform.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased bg-[#07131E] text-[#F5FAFC]`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
