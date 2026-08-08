'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, Sparkles, User, RefreshCw, BarChart3, TrendingUp, ShieldAlert, Compass, ArrowRightLeft, FileText } from 'lucide-react'
import { assistantApi } from '@/lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  capabilities?: string[]
}

const analystPrompts = [
  'Detect thermal anomalies and analyze trends',
  'Predict future scenario projections under +1.5°C shift',
  'Compare regional observations and rank priorities',
  'Explain environmental risks & SHAP feature drivers',
  'Summarize our generated PDF report catalog',
]

export default function EcoAssistantDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Welcome to the **EcoRal AI Environmental Analyst**. I analyze temporal trends, detect thermal anomalies, evaluate SHAP feature drivers, and generate structured intelligence reports.',
      capabilities: ['AI Analyst Initialized'],
    },
  ])

  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input
    if (!query.trim() || loading) return

    const newMessages: Message[] = [...messages, { role: 'user', content: query }]
    setMessages(newMessages)
    if (!textToSend) setInput('')
    setLoading(true)

    try {
      const res = await assistantApi.chat({
        message: query,
        conversation_history: newMessages.map((m) => ({ role: m.role, content: m.content })).slice(-6),
      })
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          capabilities: res.capabilities_used,
        },
      ])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I encountered an issue connecting to the AI Environmental Analyst service. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[2000] p-3.5 rounded-full bg-gradient-to-r from-[#18C8FF] to-[#5EEAD4] text-[#07131E] shadow-xl hover:scale-105 transition-all flex items-center gap-2 font-bold text-xs cursor-pointer shadow-[#18C8FF]/20 border border-[#18C8FF]/40"
      >
        <BarChart3 className="w-5 h-5 text-[#07131E]" />
        <span className="hidden sm:inline">AI Environmental Analyst</span>
      </button>

      {/* Floating Drawer Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-6 z-[2010] w-full max-w-md h-[580px] rounded-xl border border-[#24475F] bg-[#0C1C2A] shadow-2xl flex flex-col overflow-hidden text-[#F5FAFC]"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#24475F] bg-[#122535] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#18C8FF] to-[#5EEAD4] flex items-center justify-center text-[#07131E]">
                  <BarChart3 className="w-5 h-5 text-[#07131E]" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-[#F5FAFC] text-sm flex items-center gap-1.5">
                    AI Environmental Analyst
                    <Sparkles className="w-3.5 h-3.5 text-[#18C8FF]" />
                  </h3>
                  <span className="text-[10px] text-[#5EEAD4] font-semibold">Structured Intelligence Reports</span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-[#8FA6B8] hover:text-[#F5FAFC] hover:bg-[#07131E] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat History Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-md bg-[#18C8FF]/15 border border-[#18C8FF]/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-[#18C8FF]" />
                    </div>
                  )}
                  <div
                    className={`max-w-[90%] p-3.5 rounded-xl leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#18C8FF] text-[#07131E] font-semibold font-sans'
                        : 'bg-[#122535] border border-[#24475F] text-[#F5FAFC]'
                    }`}
                  >
                    {m.capabilities && m.capabilities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2 pb-1.5 border-b border-[#24475F]/60">
                        {m.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#18C8FF]/10 text-[#18C8FF] border border-[#18C8FF]/20"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    )}

                    {m.content.split('\n').map((line, i) => (
                      <p key={i} className={i > 0 ? 'mt-1.5' : ''}>
                        {line.replace(/\*\*/g, '')}
                      </p>
                    ))}
                  </div>
                  {m.role === 'user' && (
                    <div className="w-6 h-6 rounded-md bg-[#5EEAD4]/20 border border-[#5EEAD4]/30 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-[#5EEAD4]" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-2.5 items-center text-[#8FA6B8]">
                  <div className="w-6 h-6 rounded-md bg-[#18C8FF]/15 border border-[#18C8FF]/30 flex items-center justify-center">
                    <RefreshCw className="w-3.5 h-3.5 text-[#18C8FF] animate-spin" />
                  </div>
                  <span className="text-[11px] font-medium animate-pulse">Generating AI Analyst Structured Report...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Analyst Suggested Prompts */}
            {messages.length < 5 && (
              <div className="px-4 py-2 border-t border-[#24475F]/60 bg-[#07131E]/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {analystPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-[#122535] border border-[#24475F] text-[10px] text-[#8FA6B8] hover:text-[#18C8FF] hover:border-[#18C8FF]/40 transition-all cursor-pointer font-medium"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 border-t border-[#24475F] bg-[#122535]">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Analyst: trends, anomalies, forecasts..."
                  className="flex-1 px-3 py-2 rounded-lg border border-[#24475F] bg-[#07131E] text-[#F5FAFC] placeholder:text-[#8FA6B8]/50 focus:outline-none focus:border-[#18C8FF] text-xs transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="p-2 rounded-lg bg-[#18C8FF] text-[#07131E] hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
