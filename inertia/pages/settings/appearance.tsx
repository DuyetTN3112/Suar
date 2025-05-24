import React, { useState } from 'react'
import { Head, useForm, usePage } from '@inertiajs/react'
import { Link } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  theme?: string
  font?: string
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
  [key: string]: any
}

export default function Appearance() {
  // Lấy dữ liệu người dùng từ props với kiểm tra null
  const page = usePage<PageProps>()
  const auth = page.props.auth
  const user = auth?.user || {
    id: '',
    username: '',
    email: '',
    user_setting: { theme: 'light', font: 'inter' }
  }

  // Khởi tạo form với dữ liệu thực
  const form = useForm({
    theme: user.user_setting?.theme || 'light',
    font: user.user_setting?.font || 'inter'
  })

  // Theo dõi chủ đề đã chọn để hiển thị UI
  const [selectedTheme, setSelectedTheme] = useState(form.data.theme)

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
    form.post('/settings/appearance', {
      onSuccess: () => {
        // Áp dụng chủ đề mới không cần làm mới trang
        document.documentElement.classList.remove('dark', 'light')
        document.documentElement.classList.add(form.data.theme)
      }
    })
  }

  // Xử lý khi chọn chủ đề
  const handleThemeChange = (theme: string) => {
    form.setData('theme', theme)
    setSelectedTheme(theme)
  }

  return (
    <>
      <Head title="Giao diện" />
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
                    item.href === '/settings/appearance'
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
                <CardTitle>Giao diện</CardTitle>
                <CardDescription>
                  Tùy chỉnh giao diện của ứng dụng. Tự động chuyển đổi giữa chế độ ban ngày và ban đêm.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Font */}
                  <div className="space-y-2">
                    <Label>Font</Label>
                    <Select
                      value={form.data.font}
                      onValueChange={(value) => form.setData('font', value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Chọn font" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inter">Inter</SelectItem>
                        <SelectItem value="manrope">Manrope</SelectItem>
                        <SelectItem value="system">System UI</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Đặt font bạn muốn sử dụng trong bảng điều khiển.
                    </p>
                  </div>

                  {/* Theme */}
                  <div className="space-y-2">
                    <Label>Chủ đề</Label>
                    <p className="text-sm text-muted-foreground">
                      Chọn chủ đề cho bảng điều khiển.
                    </p>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      {/* Light theme */}
                      <div
                        className={`flex flex-col items-center gap-2 rounded-md border-2 p-4 cursor-pointer hover:border-primary ${selectedTheme === 'light' ? 'border-primary' : 'border-border'}`}
                        onClick={() => handleThemeChange('light')}
                      >
                        <div className="w-full rounded-md border border-border p-4 bg-background">
                          <div className="space-y-2">
                            <div className="h-2 w-3/4 rounded-md bg-muted"></div>
                            <div className="h-2 w-1/2 rounded-md bg-muted"></div>
                            <div className="h-2 w-2/3 rounded-md bg-muted"></div>
                          </div>
                        </div>
                        <span>Sáng</span>
                      </div>

                      {/* Dark theme */}
                      <div
                        className={`flex flex-col items-center gap-2 rounded-md border-2 p-4 cursor-pointer hover:border-primary ${selectedTheme === 'dark' ? 'border-primary' : 'border-border'}`}
                        onClick={() => handleThemeChange('dark')}
                      >
                        <div className="w-full rounded-md border border-border p-4 bg-zinc-950">
                          <div className="space-y-2">
                            <div className="h-2 w-3/4 rounded-md bg-zinc-800"></div>
                            <div className="h-2 w-1/2 rounded-md bg-zinc-800"></div>
                            <div className="h-2 w-2/3 rounded-md bg-zinc-800"></div>
                          </div>
                        </div>
                        <span>Tối</span>
                      </div>
                    </div>
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

Appearance.layout = (page: React.ReactNode) => <AppLayout title="Giao diện">{page}</AppLayout>
