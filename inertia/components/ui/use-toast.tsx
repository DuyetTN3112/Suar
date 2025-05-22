import React, { createContext, useContext, useState } from 'react'

type Toast = {
  id: string
  title: string
  description?: string
  type?: 'default' | 'success' | 'error' | 'warning' | 'info'
}

type ToastContextType = {
  toasts: Toast[]
  toast: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])
    setTimeout(() => {
      dismiss(id)
    }, 5000)
  }

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-0 right-0 z-50 p-4 space-y-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-md shadow-md bg-white dark:bg-gray-800 border-l-4 ${
              toast.type === 'success'
                ? 'border-green-500'
                : toast.type === 'error'
                ? 'border-red-500'
                : toast.type === 'warning'
                ? 'border-yellow-500'
                : toast.type === 'info'
                ? 'border-blue-500'
                : 'border-gray-500'
            }`}
          >
            <div className="flex justify-between">
              <div>
                <h3 className="font-medium">{toast.title}</h3>
                {toast.description && <p className="text-sm text-muted-foreground">{toast.description}</p>}
              </div>
              <button onClick={() => dismiss(toast.id)} className="text-muted-foreground">
                &times;
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
} 