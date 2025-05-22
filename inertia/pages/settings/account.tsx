import React from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

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
              <CardTitle>Đổi mật khẩu</CardTitle>
              <CardDescription>
                Cập nhật mật khẩu để bảo vệ tài khoản của bạn
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-12 text-muted-foreground">
                Form đổi mật khẩu sẽ xuất hiện ở đây
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline">Đổi mật khẩu</Button>
            </CardFooter>
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