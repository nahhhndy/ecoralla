'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LayoutDashboard, Map, History, FileText, Settings, LogOut, Waves, FolderKanban } from 'lucide-react'
import { useAuth } from '@/lib/providers'
import { useEffect } from 'react'
import EcoAssistantDrawer from '@/components/assistant/EcoAssistantDrawer'

const navSections = [
  {
    group: 'Overview',
    items: [{ href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    group: 'Explore',
    items: [{ href: '/map', icon: Map, label: 'Ocean Map' }],
  },
  {
    group: 'Research',
    items: [{ href: '/workspace', icon: FolderKanban, label: 'Research Workspace' }],
  },
  {
    group: 'Intelligence',
    items: [
      { href: '/history', icon: History, label: 'Prediction History' },
      { href: '/reports', icon: FileText, label: 'Reports & Export' },
    ],
  },
  {
    group: 'System',
    items: [{ href: '/settings', icon: Settings, label: 'Settings' }],
  },
]

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading, router])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#07131E] text-[#F5FAFC]">
        <div className="w-9 h-9 border-2 border-[#18C8FF]/20 border-t-[#18C8FF] rounded-full animate-spin mb-4" />
        <span className="text-xs text-[#8FA6B8] tracking-wider uppercase font-medium">Loading EcoRal Platform...</span>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#07131E] text-[#F5FAFC]">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-[#24475F] bg-[#0C1C2A]/95 shrink-0 z-[1010] relative">
        <div className="flex items-center gap-3 px-5 h-16 border-b border-[#24475F]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#18C8FF] to-[#5EEAD4] flex items-center justify-center text-[#07131E] font-bold text-sm font-display shadow-sm shadow-[#18C8FF]/20">
            <Waves className="w-5 h-5 text-[#07131E]" />
          </div>
          <span className="font-display font-bold text-[#F5FAFC] text-base tracking-tight">EcoRal</span>
          <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#5EEAD4]/10 border border-[#5EEAD4]/20">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5EEAD4] animate-pulse" />
            <span className="text-[10px] font-semibold text-[#5EEAD4] tracking-wide uppercase">v1.0</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {navSections.map((sec) => (
            <div key={sec.group} className="space-y-1">
              <span className="px-3.5 text-[10px] font-extrabold uppercase tracking-widest text-[#8FA6B8]/60">
                {sec.group}
              </span>
              {sec.items.map((item) => {
                const active = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      active
                        ? 'bg-[#18C8FF]/15 text-[#18C8FF] border border-[#18C8FF]/30 shadow-sm'
                        : 'text-[#8FA6B8] hover:text-[#F5FAFC] hover:bg-[#122535]'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 transition-colors ${active ? 'text-[#18C8FF]' : 'text-[#8FA6B8]'}`} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="p-3.5 border-t border-[#24475F] bg-[#07131E]/40">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#18C8FF] to-[#5EEAD4] flex items-center justify-center text-[#07131E] text-xs font-bold shadow-sm">
              {user.full_name ? user.full_name[0]?.toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#F5FAFC] truncate">{user.full_name}</p>
              <p className="text-[11px] text-[#8FA6B8] truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); router.push('/login') }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-[#8FA6B8] hover:text-[#FF5A6E] hover:bg-[#FF5A6E]/10 transition-all border border-transparent hover:border-[#FF5A6E]/20 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto bg-[#07131E] relative">
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="h-full"
        >
          {children}
        </motion.div>

        {/* Global AI Environmental Assistant Drawer */}
        <EcoAssistantDrawer />
      </main>
    </div>
  )
}
