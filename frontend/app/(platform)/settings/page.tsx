'use client'
import { useAuth } from '@/lib/providers'
import { User, Mail, Calendar, Shield, Cpu, Layers } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  
  return (
    <div className="p-6 max-w-4xl space-y-6 mx-auto text-[#F5FAFC]">
      <div className="border-b border-[#24475F]/60 pb-5">
        <h1 className="font-display text-2xl font-bold text-[#F5FAFC]">Account & System Settings</h1>
        <p className="text-xs text-[#8FA6B8] mt-1">Platform credentials, user preferences, and AI engine information</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="p-6 rounded-xl border border-[#24475F] bg-[#0C1C2A] space-y-4">
          <h2 className="font-display font-bold text-[#F5FAFC] text-sm flex items-center gap-2 border-b border-[#24475F] pb-3">
            <User className="w-4 h-4 text-[#18C8FF]" />
            User Profile
          </h2>
          {[
            { icon: User, label: 'Full Name', value: user?.full_name },
            { icon: Mail, label: 'Email Address', value: user?.email },
            { icon: Calendar, label: 'Registered', value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active' },
            { icon: Shield, label: 'User ID', value: user?.id ? `${user.id.slice(0, 13)}...` : '—' }
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3 py-2 border-b border-[#24475F]/60 last:border-0">
              <row.icon className="w-4 h-4 text-[#8FA6B8]" />
              <span className="text-xs font-semibold text-[#8FA6B8] w-28 uppercase tracking-wider">{row.label}</span>
              <span className="text-xs text-[#F5FAFC] font-mono font-semibold">{row.value}</span>
            </div>
          ))}
        </div>

        {/* Engine Metadata Card */}
        <div className="p-6 rounded-xl border border-[#24475F] bg-[#0C1C2A] space-y-4">
          <h2 className="font-display font-bold text-[#F5FAFC] text-sm flex items-center gap-2 border-b border-[#24475F] pb-3">
            <Cpu className="w-4 h-4 text-[#5EEAD4]" />
            EcoRal AI Engine Metadata
          </h2>
          {[
            { icon: Layers, label: 'Model', value: 'XGBoost 2.1.3 Classifier' },
            { icon: Shield, label: 'Explainability', value: 'SHAP TreeExplainer v0.44' },
            { icon: Cpu, label: 'Backend API', value: 'FastAPI (Python 3.12)' },
            { icon: Calendar, label: 'Database', value: 'PostgreSQL 16 (SQLAlchemy 2.0 Async)' }
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3 py-2 border-b border-[#24475F]/60 last:border-0">
              <row.icon className="w-4 h-4 text-[#8FA6B8]" />
              <span className="text-xs font-semibold text-[#8FA6B8] w-28 uppercase tracking-wider">{row.label}</span>
              <span className="text-xs text-[#5EEAD4] font-medium">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
