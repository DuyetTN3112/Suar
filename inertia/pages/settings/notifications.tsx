import React from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Notifications() {
  return (
    <>
      <Head title="Cài đặt thông báo" />
      <div className="container py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Cài đặt thông báo</h1>
          <Button variant="outline">Lưu thay đổi</Button>
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tùy chọn thông báo</CardTitle>
              <CardDescription>
                Tùy chỉnh cách bạn nhận thông báo từ hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-12 text-muted-foreground">
                Các tùy chọn thông báo sẽ xuất hiện ở đây
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

Notifications.layout = (page: React.ReactNode) => <AppLayout title="Cài đặt thông báo">{page}</AppLayout>
