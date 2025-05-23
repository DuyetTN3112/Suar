import React, { useEffect, useState } from 'react'
import { Head, usePage } from '@inertiajs/react'
import Navbar from '@/components/layout/nav_bar'
import { AppSidebar } from '@/components/layout/app_sidebar'
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar/index'
import OrganizationRequiredSimpleDialog from '@/components/ui/organization_required_simple_dialog'
import { SharedProps } from '@adonisjs/inertia/types'

type AppLayoutProps = {
  title: string
  children: React.ReactNode
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { state } = useSidebar()
  const { props, url } = usePage<SharedProps>()
  const [showOrganizationDialog, setShowOrganizationDialog] = useState(false)
  
  useEffect(() => {
    // Kiểm tra xem người dùng có tổ chức hiện tại không
    const hasCurrentOrganization = props.auth?.user?.current_organization_id
    
    // Kiểm tra đường dẫn hiện tại có phải là trang tổ chức không
    const isOrganizationsPage = url.startsWith('/organizations')
    
    // Chỉ hiển thị modal khi cần hiển thị (từ server) và không ở trang tổ chức
    // và người dùng không có tổ chức hiện tại
    if (props.showOrganizationRequiredModal && !isOrganizationsPage && !hasCurrentOrganization) {
      setShowOrganizationDialog(true)
    } else {
      // Đóng dialog nếu đang mở và không còn cần thiết
      if (showOrganizationDialog && (isOrganizationsPage || hasCurrentOrganization)) {
        setShowOrganizationDialog(false)
      }
    }
  }, [props.showOrganizationRequiredModal, props.auth?.user?.current_organization_id, url])
  
  return (
    <div className="flex flex-col w-full min-h-screen transition-all duration-300 ease-in-out">
      <Navbar />
      <main className="flex-1">{children}</main>
      
      {/* Modal yêu cầu tổ chức đơn giản */}
      <OrganizationRequiredSimpleDialog 
        open={showOrganizationDialog} 
        onOpenChange={setShowOrganizationDialog} 
      />
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