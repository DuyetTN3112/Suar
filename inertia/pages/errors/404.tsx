import * as React from 'react'
import { Head } from '@inertiajs/react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <>
      <Head title="Không tìm thấy trang" />
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="mx-auto flex max-w-md flex-col items-center space-y-6 text-center">
          <h1 className="text-6xl font-bold">404</h1>
          <h2 className="text-2xl font-semibold">Không tìm thấy trang</h2>
          <p className="text-muted-foreground">
            Trang bạn đang tìm kiếm có thể đã bị xóa hoặc không tồn tại.
          </p>
          <Button asChild>
            <a href="/">Quay lại trang chủ</a>
          </Button>
        </div>
      </div>
    </>
  )
} 