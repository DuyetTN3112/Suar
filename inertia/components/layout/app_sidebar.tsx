import React, { useEffect } from 'react'
import { usePage } from '@inertiajs/react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar
} from '@/components/ui/sidebar/index'
import { NavGroup } from '@/components/layout/nav_group'
import { NavUser } from '@/components/layout/nav_user'
import { TeamSwitcher } from '@/components/layout/team_switcher'
import { mainNavigation } from '@/components/navigation'
import type { NavGroup as NavGroupType } from '@/components/navigation'

interface AuthUser {
  id?: string
  username?: string
  email?: string
  organizations?: Array<{
    id: string
    name: string
    logo?: string
    plan?: string
  }>
}

// Định nghĩa kiểu cho Inertia page props
interface PageProps {
  user?: {
    auth?: {
      user?: AuthUser
    }
  }
  [key: string]: unknown
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {}

export function AppSidebar(props: AppSidebarProps) {
  // Lấy toàn bộ props từ Inertia
  const page = usePage<PageProps>()
  const { state } = useSidebar()

  // Xử lý an toàn để truy cập dữ liệu người dùng
  let authUser: AuthUser | null = null
  let userInfo = null

  try {
    // Cấu trúc đúng của props từ Inertia
    const user = page.props.user?.auth?.user
    authUser = user || null

    if (authUser) {
      // Chỉ tạo userInfo khi có dữ liệu người dùng thực
      const userEmail = authUser.email || '';
      const userName = authUser.username || authUser.email || 'User';

      userInfo = {
        name: userName,
        email: userEmail,
      };
    }
  } catch (error) {
    // Chỉ ghi nhận lỗi, không thực hiện thay đổi state ở đây
    // Only log in development
    if (import.meta.env.NODE_ENV === 'development') {
      console.error('Lỗi khi truy cập dữ liệu người dùng:', error)
    }
  }

  // Debug và xử lý lỗi trong useEffect
  useEffect(() => {
  }, [state, userInfo])

  // Nếu không có userInfo (người dùng chưa đăng nhập), không hiển thị NavUser
  return (
    <Sidebar
      className="h-screen overflow-hidden"
      collapsible="offcanvas"
      variant="sidebar"
      {...props}
    >
      <SidebarHeader className="px-2 py-2">
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent className="px-2">
        {mainNavigation.map((navGroup: NavGroupType) => (
          <NavGroup key={navGroup.title} {...navGroup} />
        ))}
      </SidebarContent>
      <SidebarFooter className="px-2 py-2">
        {userInfo && <NavUser user={userInfo} />}
      </SidebarFooter>
    </Sidebar>
  )
}
