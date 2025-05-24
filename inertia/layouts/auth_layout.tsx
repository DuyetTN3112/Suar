import React from 'react'
import { Toaster } from 'sonner'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import useTranslation from '@/hooks/use_translation'

interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()

  return (
    // Changed from bg-gray-50 dark:bg-gray-950 to use bg-background which respects the theme
    <div className="min-h-screen bg-background transition-colors duration-300">
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
          <div className="flex flex-1 justify-end gap-4 items-center">
            <div className="flex items-center space-x-1">
              <ThemeSwitch />
              <LanguageSwitcher />
            </div>
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
