import { Link, usePage, router } from '@inertiajs/react'
import { Menu } from 'lucide-react'
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
import { useSidebar } from '../ui/sidebar/index'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { NotificationDropdown } from './notification_dropdown'
import useTranslation from '@/hooks/use_translation'

interface AuthUser {
  id?: string
  username?: string
  email?: string
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
  [key: string]: unknown
}

export default function Navbar() {
  const { toggleSidebar } = useSidebar()
  const page = usePage<PageProps>()
  const user = page.props.user?.auth?.user
  const { t } = useTranslation()

  // Chỉ tạo tên hiển thị khi có thông tin người dùng
  const displayName = user ? (user.username || user.email || 'User') : ''

  const avatarUrl = user ? `/avatars/${user.username || 'unknown'}.jpg` : ''
  const initials = user ? (user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U') : 'SN'

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

          {/* Chỉ hiển thị dropdown thông báo nếu có người dùng đăng nhập */}
          {user && <NotificationDropdown />}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="font-normal hidden md:inline-block">
                  {displayName || t('user.account', {}, 'Tài khoản')}
                </span>
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
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault()
                  router.post('/logout', {}, {
                    onError: (errors) => console.error('[NavBar] Logout error:', errors),
                  })
                }}
              >
                {t('auth.logout', {}, 'Đăng xuất')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
