'use client'
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'

export interface ToastMessage {
  id: string
  message: string
  type?: 'success' | 'error' | 'info'
}

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
}

interface ToastContextType {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ToastCtx = createContext<ToastContextType>({
  showToast: () => {},
  confirm: async () => false,
})

export function useToast() {
  return useContext(ToastCtx)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    options: ConfirmOptions
    resolve: (val: boolean) => void
  } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log('[TOAST SOURCE]', { message, type, stack: new Error().stack })
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve,
      })
    })
  }, [])

  const handleConfirmChoice = (choice: boolean) => {
    if (confirmState) {
      confirmState.resolve(choice)
      setConfirmState(null)
    }
  }

  return (
    <ToastCtx.Provider value={{ showToast, confirm }}>
      {children}

      {/* Toast Notification Stream Container (Non-blocking bottom-right) */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => {
            const isSuccess = t.type === 'success'
            const isError = t.type === 'error'

            const borderColor = isSuccess ? '#27D980' : isError ? '#FF5A6E' : '#18C8FF'
            const bgColor = isSuccess ? '#0B231A' : isError ? '#281116' : '#0C1C2A'

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-auto p-4 rounded-xl border shadow-2xl flex items-start gap-3 text-xs text-[#F5FAFC]"
                style={{ borderColor, backgroundColor: bgColor }}
              >
                <div className="mt-0.5 shrink-0" style={{ color: borderColor }}>
                  {isSuccess && <CheckCircle2 className="w-4 h-4" />}
                  {isError && <AlertCircle className="w-4 h-4" />}
                  {!isSuccess && !isError && <Info className="w-4 h-4" />}
                </div>
                <div className="flex-1 font-medium leading-relaxed">{t.message}</div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="text-[#8FA6B8] hover:text-[#F5FAFC] p-0.5 rounded transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal Backdrop */}
      <AnimatePresence>
        {confirmState?.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md p-6 rounded-xl border border-[#24475F] bg-[#0C1C2A] text-[#F5FAFC] shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 border-b border-[#24475F]/60 pb-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                    confirmState.options.isDestructive
                      ? 'bg-[#FF5A6E]/15 border-[#FF5A6E]/30 text-[#FF5A6E]'
                      : 'bg-[#18C8FF]/15 border-[#18C8FF]/30 text-[#18C8FF]'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-base">{confirmState.options.title}</h3>
              </div>

              <p className="text-xs text-[#8FA6B8] leading-relaxed">
                {confirmState.options.message}
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleConfirmChoice(false)}
                  className="px-4 py-2 rounded-lg border border-[#24475F] bg-[#122535] text-xs font-semibold text-[#8FA6B8] hover:text-[#F5FAFC] hover:bg-[#182C3D] transition-colors cursor-pointer"
                >
                  {confirmState.options.cancelText || 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmChoice(true)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md ${
                    confirmState.options.isDestructive
                      ? 'bg-[#FF5A6E] text-[#07131E] hover:opacity-90 shadow-[#FF5A6E]/20'
                      : 'bg-[#18C8FF] text-[#07131E] hover:opacity-90 shadow-[#18C8FF]/20'
                  }`}
                >
                  {confirmState.options.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastCtx.Provider>
  )
}
