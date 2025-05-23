'use client'

import React from 'react'
import { router } from '@inertiajs/react'
import { Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface OrganizationRequiredSimpleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function OrganizationRequiredSimpleDialog({
  open,
  onOpenChange,
}: OrganizationRequiredSimpleDialogProps) {
  // Xử lý chuyển hướng đến trang tổ chức
  const handleGoToOrganizations = () => {
    router.visit('/organizations')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
              <Building className="h-8 w-8 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">Cần có tổ chức</DialogTitle>
          <DialogDescription className="text-center">
            Bạn cần tham gia hoặc tạo một tổ chức để truy cập tính năng này.<br />
            Để sử dụng đầy đủ tính năng của hệ thống, bạn cần phải là thành viên của ít nhất một tổ chức.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-center gap-3 mt-6">
          <Button 
            onClick={handleGoToOrganizations}
            variant="default" 
            size="lg"
            className="w-full"
          >
            <Building className="mr-2 h-5 w-5" />
            Xem danh sách tổ chức
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 