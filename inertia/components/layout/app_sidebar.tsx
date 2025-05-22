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
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
  avatar?: string
  username?: string
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
  [key: string]: any
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
      const userName = authUser.username || '';
      
      userInfo = {
        name: authUser.full_name || 
              `${authUser.first_name || ''} ${authUser.last_name || ''}`.trim(),
        email: userEmail,
        avatar: authUser.avatar || `/avatars/${userName}.jpg`,
      };
    }
  } catch (error) {
    // Chỉ ghi nhận lỗi, không thực hiện thay đổi state ở đây
    console.error('Lỗi khi truy cập dữ liệu người dùng:', error)
  }
  
  // Tạo menu settings riêng với các submenu
  const settingsNavigation: NavGroupType = {
    title: 'Cài đặt',
    items: [
      {
        title: 'Cài đặt',
        icon: mainNavigation[2].items[0].icon, // Lấy icon Settings từ navigation chính
        items: [
          {
            title: 'Hồ sơ',
            url: '/settings/profile',
            icon: undefined,
          },
          {
            title: 'Tài khoản',
            url: '/settings/account',
            icon: undefined,
          },
          {
            title: 'Giao diện',
            url: '/settings/appearance',
            icon: undefined,
          },
          {
            title: 'Thông báo',
            url: '/settings/notifications',
            icon: undefined,
          },
          {
            title: 'Hiển thị',
            url: '/settings/display',
            icon: undefined,
          },
        ],
      },
    ],
  };
  
  // Tạo mảng navigation mới với các mục tổng quan, ứng dụng và menu settings mới
  const modifiedNavigation = [
    mainNavigation[0], // Tổng quan
    mainNavigation[1], // Ứng dụng
    settingsNavigation,
  ];
  
  // Debug và xử lý lỗi trong useEffect
  useEffect(() => {
    console.log('=== AppSidebar State ===')
    console.log('Sidebar state:', state)
    console.log('User data:', userInfo)
  }, [state, userInfo])
  
  // Nếu không có userInfo (người dùng chưa đăng nhập), không hiển thị NavUser
  return (
    <Sidebar 
      className="h-screen overflow-hidden" 
      collapsible="icon" 
      variant="sidebar"
      {...props}
    >
      <SidebarHeader className="px-2 py-2">
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent className="px-2">
        {modifiedNavigation.map((navGroup: NavGroupType) => (
          <NavGroup key={navGroup.title} {...navGroup} />
        ))}
      </SidebarContent>
      <SidebarFooter className="px-2 py-2">
        {userInfo && <NavUser user={userInfo} />}
      </SidebarFooter>
    </Sidebar>
  )
}
