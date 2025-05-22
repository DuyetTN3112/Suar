import React from 'react'
import { Head, useForm, usePage } from '@inertiajs/react'
import { Link } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Import icons
import { User, CreditCard, Bell, Eye, Palette } from 'lucide-react'

// Define sidebar item type
interface SidebarItem {
  title: string
  href: string
  icon: React.ElementType
}

// Define các type dữ liệu từ backend
interface UserData {
  id: string
  first_name: string
  last_name: string
  username: string
  email: string
  full_name: string
  avatar?: string
  user_profile?: {
    bio?: string
  }
  user_urls?: Array<{
    id: number
    url: string
  }>
}

interface PageProps {
  auth?: {
    user?: UserData
  }
  [key: string]: any
}

export default function Settings() {
  // Lấy dữ liệu người dùng từ props với kiểm tra null
  const page = usePage<PageProps>()
  const auth = page.props.auth
  const user = auth?.user || {
    id: '',
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    full_name: '',
    user_profile: { bio: '' },
    user_urls: []
  }

  // Khởi tạo form với dữ liệu thực
  const form = useForm({
    bio: user.user_profile?.bio || '',
    urls: user.user_urls?.map(item => item.url) || []
  })

  // Define sidebar items
  const sidebarItems: SidebarItem[] = [
    { title: 'Hồ sơ', href: '/settings/profile', icon: User },
    { title: 'Tài khoản', href: '/settings/account', icon: CreditCard },
    { title: 'Giao diện', href: '/settings/appearance', icon: Palette },
    { title: 'Thông báo', href: '/settings/notifications', icon: Bell },
    { title: 'Hiển thị', href: '/settings/display', icon: Eye }
  ]

  // Detect current active item
  const currentPath = window.location.pathname
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    form.post('/settings/profile', {
      onSuccess: () => {
        // Hiển thị thông báo thành công
      }
    })
  }

  // Add URL field
  const addUrl = () => {
    form.setData('urls', [...form.data.urls, ''])
  }

  // Remove URL field
  const removeUrl = (index: number) => {
    form.setData('urls', form.data.urls.filter((_, i) => i !== index))
  }

  // Update URL value
  const updateUrl = (index: number, value: string) => {
    const updatedUrls = [...form.data.urls]
    updatedUrls[index] = value
    form.setData('urls', updatedUrls)
  }

  return (
    <>
      <Head title="Cài đặt" />
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

          {/* Content */}
          <div className="col-span-9">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin cá nhân</CardTitle>
                <CardDescription>
                  Đây là cách người khác sẽ nhìn thấy bạn trên trang web.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Thông tin hiển thị public */}
                  <div className="space-y-2">
                    <p>
                      Đây là tên hiển thị công khai của bạn. Nó có thể là tên thật của bạn hoặc một bút danh. Bạn chỉ có thể thay đổi nội dung này 30 ngày một lần.
                    </p>
                  </div>

                  {/* Chọn email để hiển thị */}
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Select defaultValue="verified">
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn email đã xác minh để hiển thị" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="verified">
                          {user.email}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Bạn có thể quản lý địa chỉ email đã xác minh trong phần cài đặt email.
                    </p>
                  </div>
                
                  {/* Bio section */}
                  <div className="space-y-2">
                    <Label htmlFor="bio">Giới thiệu</Label>
                    <Textarea
                      id="bio"
                      value={form.data.bio}
                      onChange={(e) => form.setData('bio', e.target.value)}
                      rows={3}
                      placeholder="Viết một vài câu về bản thân"
                    />
                  </div>

                  {/* URLs section */}
                  <div className="space-y-2">
                    <Label>Đường dẫn</Label>
                    <p className="text-sm text-muted-foreground">
                      Thêm liên kết đến website, blog, hoặc mạng xã hội của bạn.
                    </p>
                    
                    <div className="space-y-2">
                      {form.data.urls.map((url, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={url}
                            onChange={(e) => updateUrl(index, e.target.value)}
                            placeholder="https://example.com"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeUrl(index)}
                          >
                            Xóa
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addUrl}
                      >
                        Thêm URL
                      </Button>
                    </div>
                  </div>

                  {/* Mention options */}
                  <div className="space-y-2">
                    <p className="text-sm">
                      Bạn có thể <span className="text-primary">@mention</span> người dùng và tổ chức khác để liên kết đến họ.
                    </p>
                  </div>

                  {/* Submit button */}
                  <div>
                    <Button type="submit" className="mt-4">
                      Cập nhật hồ sơ
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

Settings.layout = (page: React.ReactNode) => <AppLayout title="Cài đặt">{page}</AppLayout> 