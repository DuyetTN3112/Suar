import React from 'react'
import { Link } from '@inertiajs/react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center">
        <h1 className="text-9xl font-extrabold text-slate-900 dark:text-slate-50">404</h1>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-4">Không tìm thấy trang</h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href="/">Quay lại trang chủ</Link>
          </Button>
        </div>
      </div>
    </div>
  )
} 