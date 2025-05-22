import React from 'react'
import { Head } from '@inertiajs/react'
import AppLayout from '@/layouts/app_layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function AppCategories() {
  return (
    <>
      <Head title="Danh mục ứng dụng" />
      <div className="container py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Danh mục ứng dụng</h1>
          <Button>Thêm danh mục mới</Button>
        </div>
        
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách danh mục</CardTitle>
              <CardDescription>
                Quản lý các danh mục ứng dụng trong hệ thống của bạn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-12 text-muted-foreground">
                Danh sách danh mục sẽ xuất hiện ở đây
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Thêm danh mục mới</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  )
}

AppCategories.layout = (page: React.ReactNode) => <AppLayout title="Danh mục ứng dụng">{page}</AppLayout> 