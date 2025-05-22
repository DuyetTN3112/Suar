import React from 'react'
import { Head, useForm } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function Login() {
  const { data, setData, post, processing, errors } = useForm({
    email: '',
    password: '',
    remember: false,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    post('/login')
  }

  return (
    <>
      <Head title="Đăng nhập" />
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Card className="mx-auto w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Đăng nhập</CardTitle>
            <CardDescription className="text-center">
              Nhập thông tin đăng nhập của bạn để truy cập hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={data.email}
                  onChange={(e) => setData('email', e.target.value)}
                  required
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  value={data.password}
                  onChange={(e) => setData('password', e.target.value)}
                  required
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={data.remember}
                  onCheckedChange={(checked) => {
                    if (checked === true || checked === 'indeterminate') {
                      setData('remember', true)
                    } else {
                      setData('remember', false)
                    }
                  }}
                />
                <Label htmlFor="remember" className="text-sm font-medium">
                  Ghi nhớ đăng nhập
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={processing}>
                {processing ? 'Đang xử lý...' : 'Đăng nhập'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <div className="text-center text-sm">
              <a href="/register" className="text-primary hover:underline">
                Chưa có tài khoản? Đăng ký
              </a>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  )
} 