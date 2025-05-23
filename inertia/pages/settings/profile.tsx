import React, { useRef, useState } from 'react'
import { Head, useForm, usePage } from '@inertiajs/react'
import { Link } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Import icons
import { User, CreditCard, Bell, Eye, Palette, Upload } from 'lucide-react'

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

export default function Profile() {
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
    avatar: '',
    user_profile: { bio: '' },
    user_urls: []
  }

  // Form data
  const form = useForm({
    bio: user.user_profile?.bio || '',
    urls: user.user_urls?.map(item => item.url) || []
  })
  
  // Avatar upload
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Tạo preview URL
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    
    // Upload file
    const formData = new FormData()
    formData.append('avatar', file)
    
    setIsUploading(true)
    
    // Gửi request upload avatar
    fetch('/profile/avatar', {
      method: 'POST',
      body: formData,
      headers: {
        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
      },
      credentials: 'same-origin',
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Upload failed')
      }
      return response.json()
    })
    .then(() => {
      // Reload page để hiển thị avatar mới
      window.location.reload()
    })
    .catch(error => {
      console.error('Error uploading avatar:', error)
      // Reset preview
      setPreviewUrl(null)
    })
    .finally(() => {
      setIsUploading(false)
    })
  }
  
  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

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
      <Head title="Hồ sơ cá nhân" />
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
                    item.href === '/settings/profile'
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
                {/* Avatar section */}
                <div className="mb-6 pb-6 border-b border-border">
                  <Label className="block mb-2">Ảnh đại diện</Label>
                  <div className="flex items-center gap-5">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={previewUrl || user.avatar} alt={user.full_name} />
                      <AvatarFallback>{user.first_name?.[0]}{user.last_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/jpeg,image/png,image/jpg"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={triggerFileInput}
                        disabled={isUploading}
                      >
                        {isUploading ? 'Đang tải lên...' : 'Tải lên ảnh mới'}
                        {!isUploading && <Upload className="ml-2 h-4 w-4" />}
                      </Button>
                      <p className="text-sm text-muted-foreground mt-2">
                        Chấp nhận JPG, PNG. Kích thước tối đa 2MB.
                      </p>
                    </div>
                  </div>
                </div>

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
                    <Button type="submit">
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

Profile.layout = (page: React.ReactNode) => <AppLayout title="Hồ sơ cá nhân">{page}</AppLayout> 