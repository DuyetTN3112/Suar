import React from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function Apps() {
  return (
    <>
      <Head title="Ứng dụng" />
      <div className="container py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Ứng dụng</h1>
          <Button>Thêm ứng dụng mới</Button>
        </div>
        
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách ứng dụng</CardTitle>
              <CardDescription>
                Quản lý các ứng dụng trong hệ thống của bạn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-12 text-muted-foreground">
                Danh sách ứng dụng sẽ xuất hiện ở đây
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Thêm ứng dụng mới</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  )
}

Apps.layout = (page: React.ReactNode) => <AppLayout title="Ứng dụng">{page}</AppLayout> 