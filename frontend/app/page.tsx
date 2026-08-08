'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Activity, Map, FileText, Shield, Zap, Globe, Waves, Sparkles, CheckCircle2 } from 'lucide-react'

const features = [
  { icon: Activity, title: 'Real-time Telemetry Predictions', desc: 'XGBoost model trained on global SST data delivers 97%+ accuracy for coral bleaching vulnerability.' },
  { icon: Map, title: 'Interactive GIS Ocean Map', desc: 'Click any oceanic coordinate worldwide for instant bleaching risk assessment & spatial telemetry.' },
  { icon: FileText, title: 'SHAP AI Explainability', desc: 'Natural language explanations powered by SHAP tree-explainers show feature importance for every observation.' },
  { icon: Shield, title: 'Enterprise Security & Auth', desc: 'JWT authentication, password hashing, activity logs, and secure repository data layer.' },
  { icon: Zap, title: 'High-Performance Stack', desc: 'PostgreSQL 16, async SQLAlchemy 2.0, Redis caching, and sub-100ms inference response.' },
  { icon: Globe, title: 'Publication-Ready PDF Reports', desc: 'Generate downloadable PDF assessment reports complete with SHAP charts and recommendations.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#07131E] text-[#F5FAFC]">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-[#24475F]/60 bg-[#07131E]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#18C8FF] to-[#5EEAD4] flex items-center justify-center text-[#07131E] font-bold text-sm font-display shadow-sm shadow-[#18C8FF]/20">
            <Waves className="w-5 h-5 text-[#07131E]" />
          </div>
          <span className="font-display font-bold text-[#F5FAFC] text-lg tracking-tight">EcoRal</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-xs font-semibold text-[#8FA6B8] hover:text-[#F5FAFC] transition-colors">
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-xs font-bold px-4 py-2 rounded-lg bg-gradient-to-r from-[#18C8FF] to-[#5EEAD4] text-[#07131E] hover:opacity-95 transition-all shadow-sm shadow-[#18C8FF]/20"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center min-h-screen pt-24 px-6 text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#18C8FF]/4 blur-[130px]" />
          <div className="absolute top-2/3 left-1/4 w-[450px] h-[450px] rounded-full bg-[#5EEAD4]/4 blur-[90px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative z-10 max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full border border-[#18C8FF]/30 bg-[#18C8FF]/10 text-[#18C8FF] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Environmental Intelligence Platform</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-bold text-[#F5FAFC] leading-tight mb-6 tracking-tight">
            Advanced Coral Bleaching
            <span className="block bg-gradient-to-r from-[#18C8FF] via-[#5EEAD4] to-[#27D980] bg-clip-text text-transparent">
              Intelligence & Risk Analytics
            </span>
          </h1>

          <p className="text-base text-[#8FA6B8] max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            EcoRal delivers real-time thermal vulnerability forecasts for reef conservationists and ocean scientists. Powered by XGBoost, SHAP explainability, and automated PDF report export.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-[#18C8FF] to-[#5EEAD4] text-[#07131E] font-bold text-sm hover:opacity-95 transition-all shadow-md shadow-[#18C8FF]/20 cursor-pointer"
            >
              Initialize Platform
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 px-6 py-3 rounded-lg border border-[#24475F] bg-[#0C1C2A] text-[#F5FAFC] text-sm font-semibold hover:border-[#18C8FF]/40 transition-colors"
            >
              Sign In to Account
            </Link>
          </div>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="relative z-10 mt-16 grid grid-cols-3 gap-8 max-w-xl p-5 rounded-xl border border-[#24475F] bg-[#0C1C2A]"
        >
          {[
            ['97.0%', 'Model Accuracy'],
            ['0.9954', 'ROC AUC Metric'],
            ['< 100ms', 'Inference Latency'],
          ].map(([val, label]) => (
            <div key={label} className="text-center">
              <div className="text-xl font-display font-bold text-[#18C8FF]">{val}</div>
              <div className="text-[11px] font-medium text-[#8FA6B8] mt-0.5">{label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 border-t border-[#24475F]/60 bg-[#0C1C2A]/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F5FAFC] mb-3">Enterprise Environmental Intelligence</h2>
            <p className="text-xs text-[#8FA6B8] max-w-md mx-auto">Engineered for oceanographic institutions, reef monitoring teams, and environmental analysts.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-6 rounded-xl border border-[#24475F] bg-[#122535] card-hover-elevation group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#18C8FF]/10 border border-[#18C8FF]/20 flex items-center justify-center mb-4 group-hover:bg-[#18C8FF]/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-[#18C8FF]" />
                </div>
                <h3 className="font-display font-bold text-[#F5FAFC] text-base mb-2">{feature.title}</h3>
                <p className="text-xs text-[#8FA6B8] leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#24475F] py-8 px-6 bg-[#07131E]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-[#18C8FF]" />
            <span className="font-display text-sm font-bold text-[#F5FAFC]">EcoRal</span>
          </div>
          <span className="text-xs text-[#8FA6B8]">© {new Date().getFullYear()} EcoRal Environmental Intelligence Platform. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
