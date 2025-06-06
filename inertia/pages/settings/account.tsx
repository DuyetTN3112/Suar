import React from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Account() {
  return (
    <>
      <Head title="Cài đặt tài khoản" />
      <div className="container py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Cài đặt tài khoản</h1>
        </div>

        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Đăng nhập OAuth</CardTitle>
              <CardDescription>
                Ứng dụng này sử dụng OAuth (Google/GitHub) để đăng nhập. Không cần mật khẩu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-muted-foreground">
                Bạn đã đăng nhập thông qua nhà cung cấp OAuth.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Giao diện</CardTitle>
              <CardDescription>
                Tùy chỉnh giao diện người dùng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-12 text-muted-foreground">
                Các tùy chọn giao diện sẽ xuất hiện ở đây
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

Account.layout = (page: React.ReactNode) => <AppLayout title="Cài đặt tài khoản">{page}</AppLayout>
