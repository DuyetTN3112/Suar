import React from 'react'
import { Head, useForm } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function ResetPassword() {
  const { data, setData, post, processing, errors } = useForm({
    token: '',
    email: '',
    password: '',
    password_confirmation: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    post('/reset-password')
  }

  return (
    <>
      <Head title="Đặt lại mật khẩu" />
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Card className="mx-auto w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Đặt lại mật khẩu</CardTitle>
            <CardDescription className="text-center">
              Tạo mật khẩu mới cho tài khoản của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="hidden" name="token" value={data.token} />
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
                <Label htmlFor="password">Mật khẩu mới</Label>
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
              <div className="space-y-2">
                <Label htmlFor="password_confirmation">Xác nhận mật khẩu mới</Label>
                <Input
                  id="password_confirmation"
                  type="password"
                  value={data.password_confirmation}
                  onChange={(e) => setData('password_confirmation', e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={processing}>
                {processing ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <div className="text-center text-sm">
              <a href="/login" className="text-primary hover:underline">
                Quay lại đăng nhập
              </a>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  )
} 