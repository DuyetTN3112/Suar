import React from 'react'
import { Link } from '@inertiajs/react'
import { Toaster } from 'sonner'

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header>
        <nav className="flex items-center justify-between p-6 lg:px-8">
          <div className="flex lg:flex-1">
            <a href="/" className="-m-1.5 p-1.5">
              <span className="sr-only">ShadcnAdmin</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-auto"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M7 7h10" />
                <path d="M7 12h10" />
                <path d="M7 17h10" />
              </svg>
            </a>
          </div>
          <div className="flex flex-1 justify-end gap-4">
            <Link href="/register" className="text-sm font-semibold leading-6 text-slate-900">
              Đăng ký
            </Link>
            <Link href="/login" className="text-sm font-semibold leading-6 text-slate-900">
              Đăng nhập
            </Link>
          </div>
        </nav>
      </header>
      <div className="p-6 lg:p-8">
        <div className="flex flex-col justify-center space-y-6 w-full sm:w-[400px] mx-auto">
          {children}
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  )
} 