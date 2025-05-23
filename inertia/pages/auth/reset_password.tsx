import React from 'react'
import { Head, useForm } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import AuthLayout from '@/layouts/auth_layout'

type ResetPasswordProps = {
  email?: string
  value: string
  isValid?: boolean
}

export default function ResetPassword({ email, value, isValid = false }: ResetPasswordProps) {
  const { data, setData, post, processing, errors } = useForm({
    email: email || '',
    password: '',
    password_confirmation: '',
    value: value,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    post('/forgot-password/reset')
  }

  if (!isValid) {
    return (
      <AuthLayout>
        <Head title="Liên kết không hợp lệ" />
        <Card className="mx-auto w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Đặt lại mật khẩu</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Lỗi</AlertTitle>
              <AlertDescription>
                Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <div className="text-center text-sm">
              <a href="/forgot-password" className="text-primary hover:underline">
                Thử lại với email khác
              </a>
            </div>
          </CardFooter>
        </Card>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Head title="Đặt lại mật khẩu" />
      <Card className="mx-auto w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Đặt lại mật khẩu</CardTitle>
          <CardDescription className="text-center">
            Tạo một mật khẩu mới cho tài khoản của bạn
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
                disabled
                className="bg-muted"
              />
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
              <Label htmlFor="password_confirmation">Xác nhận mật khẩu</Label>
              <Input
                id="password_confirmation"
                type="password"
                value={data.password_confirmation}
                onChange={(e) => setData('password_confirmation', e.target.value)}
                required
              />
              {errors.password_confirmation && (
                <p className="text-sm text-destructive">{errors.password_confirmation}</p>
              )}
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
    </AuthLayout>
  )
} 