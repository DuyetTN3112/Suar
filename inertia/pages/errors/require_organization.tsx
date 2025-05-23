import React from 'react'
import { Link } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Building, Plus } from 'lucide-react'
import AppLayout from '@/layouts/app_layout'

export default function RequireOrganization() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center max-w-lg px-4">
        <div className="flex justify-center mb-6">
          <div className="h-24 w-24 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
            <Building className="h-12 w-12 text-slate-500 dark:text-slate-400" />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-slate-50">Cần có tổ chức</h1>
        <h2 className="text-xl font-medium text-slate-800 dark:text-slate-200 mt-4">
          Bạn cần tham gia hoặc tạo một tổ chức để truy cập tính năng này
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 mt-4">
          Để sử dụng đầy đủ tính năng của hệ thống, bạn cần phải là thành viên của ít nhất một tổ chức.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/organizations">
              <Building className="mr-2 h-5 w-5" />
              Xem tổ chức
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/organizations/create">
              <Plus className="mr-2 h-5 w-5" />
              Tạo tổ chức mới
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

RequireOrganization.layout = (page: React.ReactNode) => <AppLayout title="Cần tham gia tổ chức">{page}</AppLayout> 