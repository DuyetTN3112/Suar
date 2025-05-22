import React from 'react'
import { Head, useForm } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPassword() {
  const { data, setData, post, processing, errors } = useForm({
    email: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    post('/forgot-password')
  }

  return (
    <>
      <Head title="Quên mật khẩu" />
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Card className="mx-auto w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Quên mật khẩu</CardTitle>
            <CardDescription className="text-center">
              Nhập email của bạn để nhận liên kết đặt lại mật khẩu
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
      </div>
    </>
  )
} 