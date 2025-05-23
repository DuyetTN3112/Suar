import React, { useEffect } from 'react'
import { Link, usePage } from '@inertiajs/react'
import { Bell, Menu } from 'lucide-react'
import { Button } from '../ui/button'
import { Search } from '@/components/search'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown_menu'
import { useSidebar, SidebarTrigger } from '../ui/sidebar/index'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import useTranslation from '@/hooks/use_translation'

// Hàm debug log chỉ hiển thị trong chế độ phát triển
const debugLog = (message: string, ...args: any[]) => {
  if (window.DEBUG_MODE) {
    console.log(message, ...args);
  }
};

interface AuthUser {
  id?: string
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
  avatar?: string
  username?: string
}

// Định nghĩa kiểu cho Inertia page props
interface PageProps {
  user?: {
    auth?: {
      user?: AuthUser
    }
  }
  csrfToken?: string
  locale?: string
  supportedLocales?: string[]
  [key: string]: any
}

export default function Navbar() {
  const { toggleSidebar } = useSidebar()
  const page = usePage<PageProps>()
  const user = page.props.user?.auth?.user
  const csrfToken = page.props.csrfToken || ''
  const { t } = useTranslation()
  
  // Thêm log chi tiết để debug
  useEffect(() => {
    // Chỉ log khi ở chế độ debug
    if (!window.DEBUG_MODE) return;
    
    console.group('=== NavBar Authentication Debug ===')
    console.log('Page Props:', 'Available')
    console.log('User Object:', page.props.user ? 'Available' : 'Not found')
    console.log('Auth Object:', page.props.user?.auth ? 'Available' : 'Not found')
    
    if (!user) {
      console.error('NavBar: Không có thông tin người dùng')
    } else {
      console.log('Đã tìm thấy thông tin người dùng:', {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.full_name
      })
    }
    console.groupEnd()
  }, [user, page.props])
  
  // Tạo initials từ tên người dùng
  const getInitials = (name: string) => {
    if (!name) return 'ND'
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  // Chỉ tạo tên hiển thị khi có thông tin người dùng
  const displayName = user 
    ? (user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim())
    : ''
  
  const avatarUrl = user ? (user.avatar || `/avatars/${user.username || 'unknown'}.jpg`) : ''
  const initials = user ? getInitials(displayName) : 'SN'

  return (
    <header className="border-b bg-background px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 lg:gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground" 
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
          
          <div className="relative h-9 w-60 lg:w-80 hidden sm:flex">
            <Search placeholder={t('common.search', {}, 'Tìm kiếm...')} />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <ThemeSwitch />
          
          <LanguageSwitcher />
          
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Bell className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="font-normal hidden md:inline-block">{displayName || t('user.account', {}, 'Tài khoản')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile">{t('settings.profile', {}, 'Hồ sơ')}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/account">{t('settings.account', {}, 'Cài đặt tài khoản')}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <form action="/logout" method="POST" className="w-full">
                  <input type="hidden" name="_csrf" value={csrfToken} />
                  <button type="submit" className="w-full text-left flex items-center cursor-pointer">
                    {t('auth.logout', {}, 'Đăng xuất')}
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
} 