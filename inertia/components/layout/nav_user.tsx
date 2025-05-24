import React from 'react'
import { Link, usePage, router } from '@inertiajs/react'
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown_menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar/index'
import useTranslation from '@/hooks/use_translation'

interface PageProps {
  csrfToken: string
  [key: string]: any
}

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const page = usePage<PageProps>()
  const csrfToken = page.props.csrfToken || ''
  const { t } = useTranslation()

  // Tạo initials từ tên người dùng
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  const initials = getInitials(user.name)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              tooltip={user.name}
            >
              <Avatar className='h-8 w-8 rounded-lg !block'>
                <AvatarImage src={user.avatar} alt={user.name} className="!block" />
                <AvatarFallback className='rounded-lg !block'>{initials}</AvatarFallback>
              </Avatar>
              <div className='grid flex-1 text-left text-sm leading-tight'>
                <span className='truncate font-semibold'>{user.name}</span>
                <span className='truncate text-xs'>{user.email}</span>
              </div>
              <ChevronsUpDown className='ml-auto size-4' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
            side={isMobile ? 'bottom' : 'right'}
            align='end'
            sideOffset={4}
          >
            <DropdownMenuLabel className='p-0 font-normal'>
              <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className='rounded-lg'>{initials}</AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-semibold'>{user.name}</span>
                  <span className='truncate text-xs'>{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Sparkles />
                {t('user.upgrade_to_pro', {}, 'Nâng cấp lên Pro')}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href='/settings/account'>
                  <BadgeCheck />
                  {t('settings.account', {}, 'Tài khoản')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href='/settings'>
                  <CreditCard />
                  {t('user.billing', {}, 'Thanh toán')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href='/settings/notifications'>
                  <Bell />
                  {t('settings.notifications', {}, 'Thông báo')}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                router.post('/logout', {}, {
                  onError: (errors) => console.error('[NavUser] Logout error:', errors),
                })
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('auth.logout', {}, 'Đăng xuất')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
