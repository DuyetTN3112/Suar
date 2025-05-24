import React from 'react'
import { Head, useForm, usePage } from '@inertiajs/react'
import { Link } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio_group'

// Import icons
import { User, CreditCard, Bell, Eye, Palette } from 'lucide-react'

// Define sidebar item type
interface SidebarItem {
  title: string
  href: string
  icon: React.ElementType
}

// Định nghĩa kiểu dữ liệu
interface UserSetting {
  layout?: string
  density?: string
  animations_enabled?: boolean
  custom_scrollbars?: boolean
}

interface UserData {
  id: string
  username: string
  email: string
  user_setting?: UserSetting
}

interface PageProps {
  auth?: {
    user?: UserData
  }
  [key: string]: unknown
}

export default function Display() {
  // Lấy dữ liệu người dùng từ props với kiểm tra null
  const page = usePage<PageProps>()
  const auth = page.props.auth
  const user = auth?.user || {
    id: '',
    username: '',
    email: '',
    user_setting: {
      layout: 'default',
      density: 'default',
      animations_enabled: true,
      custom_scrollbars: true
    }
  }

  // Khởi tạo form với dữ liệu thực
  const form = useForm({
    layout: user.user_setting?.layout || 'default',
    density: user.user_setting?.density || 'default',
    animations_enabled: user.user_setting?.animations_enabled ?? true,
    custom_scrollbars: user.user_setting?.custom_scrollbars ?? true
  })

  // Define sidebar items
  const sidebarItems: SidebarItem[] = [
    { title: 'Hồ sơ', href: '/settings/profile', icon: User },
    { title: 'Tài khoản', href: '/settings/account', icon: CreditCard },
    { title: 'Giao diện', href: '/settings/appearance', icon: Palette },
    { title: 'Thông báo', href: '/settings/notifications', icon: Bell },
    { title: 'Hiển thị', href: '/settings/display', icon: Eye }
  ]

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    form.post('/settings/display', {
      onSuccess: () => {
        // Hiển thị thông báo thành công
      }
    })
  }

  return (
    <>
      <Head title="Hiển thị" />
      <div className="container py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-3">
            <nav className="flex flex-col space-y-1">
              {sidebarItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center rounded-md px-3 py-2 hover:bg-muted ${
                    item.href === '/settings/display'
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

          {/* Content */}
          <div className="col-span-9">
            <Card>
              <CardHeader>
                <CardTitle>Hiển thị</CardTitle>
                <CardDescription>
                  Tùy chỉnh cách giao diện người dùng hiển thị.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Layout */}
                  <div className="space-y-2">
                    <Label>Bố cục</Label>
                    <RadioGroup
                      value={form.data.layout}
                      onValueChange={(value: string) => form.setData('layout', value)}
                      className="grid grid-cols-3 gap-4 pt-2"
                    >
                      <div>
                        <RadioGroupItem
                          value="default"
                          id="layout-default"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="layout-default"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <span>Mặc định</span>
                        </Label>
                      </div>

                      <div>
                        <RadioGroupItem
                          value="compact"
                          id="layout-compact"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="layout-compact"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <span>Thu gọn</span>
                        </Label>
                      </div>

                      <div>
                        <RadioGroupItem
                          value="wide"
                          id="layout-wide"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="layout-wide"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <span>Rộng</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Density */}
                  <div className="space-y-2">
                    <Label>Mật độ hiển thị</Label>
                    <RadioGroup
                      value={form.data.density}
                      onValueChange={(value: string) => form.setData('density', value)}
                      className="grid grid-cols-3 gap-4 pt-2"
                    >
                      <div>
                        <RadioGroupItem
                          value="default"
                          id="density-default"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="density-default"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <span>Mặc định</span>
                        </Label>
                      </div>

                      <div>
                        <RadioGroupItem
                          value="comfortable"
                          id="density-comfortable"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="density-comfortable"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <span>Thoải mái</span>
                        </Label>
                      </div>

                      <div>
                        <RadioGroupItem
                          value="compact"
                          id="density-compact"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="density-compact"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <span>Thu gọn</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Animation */}
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="animations-enabled">Hiệu ứng chuyển động</Label>
                    <Switch
                      id="animations-enabled"
                      checked={form.data.animations_enabled}
                      onCheckedChange={(checked) => form.setData('animations_enabled', checked)}
                    />
                  </div>

                  {/* Scrollbars */}
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="custom-scrollbars">Thanh cuộn tùy chỉnh</Label>
                    <Switch
                      id="custom-scrollbars"
                      checked={form.data.custom_scrollbars}
                      onCheckedChange={(checked) => form.setData('custom_scrollbars', checked)}
                    />
                  </div>

                  {/* Submit button */}
                  <div>
                    <Button type="submit">
                      Cập nhật tùy chọn
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

Display.layout = (page: React.ReactNode) => <AppLayout title="Hiển thị">{page}</AppLayout>
