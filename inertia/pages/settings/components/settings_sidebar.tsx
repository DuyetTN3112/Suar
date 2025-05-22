import React from 'react'
import { Link } from '@inertiajs/react'
import { User, CreditCard, Bell, Eye, Palette } from 'lucide-react'

// Define sidebar item type
interface SidebarItem {
  title: string
  href: string
  icon: React.ElementType
}

interface SettingsSidebarProps {
  currentPath: string
}

export function SettingsSidebar({ currentPath }: SettingsSidebarProps) {
  // Define sidebar items
  const sidebarItems: SidebarItem[] = [
    { title: 'Hồ sơ', href: '/settings/profile', icon: User },
    { title: 'Tài khoản', href: '/settings/account', icon: CreditCard },
    { title: 'Giao diện', href: '/settings/appearance', icon: Palette },
    { title: 'Thông báo', href: '/settings/notifications', icon: Bell },
    { title: 'Hiển thị', href: '/settings/display', icon: Eye }
  ]

  return (
    <div className="col-span-3">
      <nav className="flex flex-col space-y-1">
        {sidebarItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center rounded-md px-3 py-2 hover:bg-muted ${
              currentPath === item.href || (currentPath === '/settings' && item.href === '/settings/profile')
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.title}
          </Link>
        ))}
      </nav>
    </div>
  )
} 