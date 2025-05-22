import * as React from 'react'
import { Head } from '@inertiajs/react'
import { Button } from '@/components/ui/button'

export default function ServerError() {
  return (
    <>
      <Head title="Lỗi máy chủ" />
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="mx-auto flex max-w-md flex-col items-center space-y-6 text-center">
          <h1 className="text-6xl font-bold">500</h1>
          <h2 className="text-2xl font-semibold">Lỗi máy chủ</h2>
          <p className="text-muted-foreground">
            Đã xảy ra lỗi từ phía máy chủ. Vui lòng thử lại sau hoặc liên hệ với quản trị viên.
          </p>
          <Button asChild>
            <a href="/">Quay lại trang chủ</a>
          </Button>
        </div>
      </div>
    </>
  )
} 