import React from 'react'
import { Head, useForm } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import AuthLayout from '@/layouts/auth_layout'

export default function ForgotPassword({ isSent = false }: { isSent?: boolean }) {
  const { data, setData, post, processing, errors } = useForm({
    email: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    post('/forgot-password')
  }

  return (
    <AuthLayout>
      <Head title="Quên mật khẩu" />
      <Card className="mx-auto w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Quên mật khẩu</CardTitle>
          {isSent ? (
            <CardDescription className="text-center text-green-600">
              Chúng tôi đã gửi email đặt lại mật khẩu đến địa chỉ email của bạn nếu tài khoản tồn tại.
            </CardDescription>
          ) : (
            <CardDescription className="text-center">
              Nhập email của bạn để nhận liên kết đặt lại mật khẩu
            </CardDescription>
          )}
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
            <Button type="submit" className="w-full" disabled={processing}>
              {processing ? 'Đang xử lý...' : 'Gửi liên kết đặt lại mật khẩu'}
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
    </AuthLayout>
  )
} 