import React, { useEffect } from 'react'
import { Head } from '@inertiajs/react'
import Navbar from '@/components/layout/nav_bar'
import { AppSidebar } from '@/components/layout/app_sidebar'
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar/index'

type AppLayoutProps = {
  title: string
  children: React.ReactNode
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar()
  
  useEffect(() => {
    console.log('AppLayout sidebar state:', state)
  }, [state])
  
  return (
    <div className="flex flex-col w-full min-h-screen transition-all duration-300 ease-in-out">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  )
}

export default function AppLayout({ title, children }: AppLayoutProps) {
  return (
    <>
      <Head title={title} />
      <SidebarProvider defaultOpen={true}>
        <div className="relative flex min-h-screen w-full">
          <AppSidebar />
          <AppLayoutContent>{children}</AppLayoutContent>
        </div>
      </SidebarProvider>
    </>
  )
} 