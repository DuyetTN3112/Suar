import React, { useEffect, useState } from 'react'
import { Head, usePage } from '@inertiajs/react'
import Navbar from '@/components/layout/nav_bar'
import { AppSidebar } from '@/components/layout/app_sidebar'
import { SidebarProvider } from '@/components/ui/sidebar/index'
import OrganizationRequiredSimpleDialog from '@/components/ui/organization_required_simple_dialog'
import { ToastProvider } from '@/components/ui/use-toast'

type AppLayoutProps = {
  title: string
  children: React.ReactNode
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { props, url } = usePage()
  const [showOrganizationDialog, setShowOrganizationDialog] = useState(false)

  useEffect(() => {
    // Kiểm tra xem người dùng có tổ chức hiện tại không
    const hasCurrentOrganization = (props as unknown).auth?.user?.current_organization_id

    // Kiểm tra đường dẫn hiện tại có phải là trang tổ chức không
    const isOrganizationsPage = url.startsWith('/organizations')

    // Chỉ hiển thị modal khi cần hiển thị (từ server) và không ở trang tổ chức
    // và người dùng không có tổ chức hiện tại
    if ((props as unknown).showOrganizationRequiredModal && !isOrganizationsPage && !hasCurrentOrganization) {
      setShowOrganizationDialog(true)
    } else {
      // Đóng dialog nếu đang mở và không còn cần thiết
      if (showOrganizationDialog && (isOrganizationsPage || hasCurrentOrganization)) {
        setShowOrganizationDialog(false)
      }
    }
  }, [(props as unknown).showOrganizationRequiredModal, (props as unknown).auth?.user?.current_organization_id, url, showOrganizationDialog])

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
      <Head>
        <title>{title || 'ShadcnAdmin'}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Content Security Policy */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self';
                   script-src 'self' 'unsafe-inline' 'unsafe-eval';
                   style-src 'self' 'unsafe-inline';
                   img-src 'self' data: https:;
                   font-src 'self' data:;
                   connect-src 'self' https:;
                   frame-src 'self';
                   object-src 'none';
                   base-uri 'self';
                   form-action 'self';"
        />
        {/* Prevent XSS attacks */}
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        {/* Prevent clickjacking */}
        <meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
        {/* Prevent MIME type sniffing */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        {/* Referrer Policy */}
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </Head>
      <ToastProvider>
        <SidebarProvider defaultOpen={true}>
          <div className="relative flex min-h-screen w-full">
            <AppSidebar />
            <AppLayoutContent>{children}</AppLayoutContent>
          </div>
        </SidebarProvider>
      </ToastProvider>
    </>
  )
}
