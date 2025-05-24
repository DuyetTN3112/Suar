import { Link, usePage } from '@inertiajs/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import React, { useEffect } from 'react'

export function ProfileDropdown() {
  const { auth, csrfToken } = usePage().props as any
  const user = auth?.user

  // Di chuyển console.error vào useEffect
  useEffect(() => {
    if (!user) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('ProfileDropdown: Không có thông tin người dùng')
      }
    }
  }, [user])

  // Nếu không có người dùng, không hiển thị dropdown
  if (!user) {
    return (
      <Button variant='ghost' className='relative h-8 w-8 rounded-full' disabled>
        <Avatar className='h-8 w-8'>
          <AvatarFallback>!</AvatarFallback>
        </Avatar>
      </Button>
    )
  }

  // Tạo initials từ tên người dùng
  const getInitials = (name: string) => {
    if (!name) return 'NA'
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  // Tạo tên hiển thị từ thông tin người dùng
  const displayName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim()

  const userEmail = user.email || ''
  const avatarUrl = user.avatar || `/avatars/${user.username || 'unknown'}.jpg`
  const initials = getInitials(displayName)

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
          <Avatar className='h-8 w-8'>
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56' align='end' forceMount>
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm leading-none font-medium'>{displayName}</p>
            <p className='text-muted-foreground text-xs leading-none'>
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href='/settings'>
              Hồ sơ
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href='/settings'>
              Thanh toán
              <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href='/settings'>
              Cài đặt
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>Nhóm mới</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <form action="/logout" method="POST" className="w-full">
            <input type="hidden" name="_csrf" value={csrfToken || ''} />
            <button type="submit" className="w-full text-left flex items-center cursor-pointer">
              Đăng xuất
              <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
