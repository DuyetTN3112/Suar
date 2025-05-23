import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { Task } from '../../types'
import { router } from '@inertiajs/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert_dialog'

type TaskItemDeleteButtonProps = {
  task: Task
  currentUser: {
    id?: string | number
    role?: string
    organization_id?: string | number
  }
}

export function TaskItemDeleteButton({ task, currentUser }: TaskItemDeleteButtonProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Kiểm tra quyền xóa task
  const canDeleteTask = () => {    
    // Không có thông tin người dùng
    if (!currentUser || !currentUser.id) {
      return false
    }
    
    // Kiểm tra xem người dùng là superadmin không
    const isSuperAdmin = currentUser.role === 'superadmin'
    
    // Superadmin luôn có quyền xóa task
    if (isSuperAdmin) {
      return true
    }
    
    // Kiểm tra task và tổ chức
    const taskOrgId = task.organization_id
    const userOrgId = currentUser.organization_id
    
    // Kiểm tra nếu không cùng tổ chức
    if (taskOrgId && userOrgId && taskOrgId !== userOrgId) {
      return false
    }
    
    // Là admin trong cùng tổ chức
    if (currentUser.role === 'admin') {
      return true
    }
    
    // Là người tạo task
    const creatorId = task.creator_id || (task.creator && task.creator.id)
    const isCreator = creatorId && Number(creatorId) === Number(currentUser.id)
    
    if (isCreator) {
      return true
    }
    
    return false
  }

  // Mở dialog xác nhận xóa
  const openDeleteConfirm = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleteDialogOpen(true)
  }
  
  // Xử lý xóa task khi đã xác nhận
  const confirmDeleteTask = () => {
    router.delete(`/tasks/${task.id}`, {
      onSuccess: () => {
        setDeleteDialogOpen(false)
      },
      onError: (errors: any) => {
        // Xử lý lỗi
        console.error('Lỗi khi xóa task:', errors)
        alert('Có lỗi xảy ra khi xóa nhiệm vụ. Vui lòng thử lại.')
      },
      preserveScroll: true,
      preserveState: false,
      replace: true,
      only: ['tasks']
    })
  }
  
  // Kiểm tra quyền và hiển thị nút
  const hasPermission = canDeleteTask()
  
  // Chỉ hiển thị nút nếu có quyền xóa
  if (!hasPermission) return null
  
  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-5 w-5"
        onClick={openDeleteConfirm}
        title="Xóa nhiệm vụ"
      >
        <Trash2 className="h-3 w-3 text-red-500" />
      </Button>
      
      {/* Dialog xác nhận xóa task */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa nhiệm vụ</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa nhiệm vụ "{task.title}"? 
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteTask}
              className="bg-red-500 hover:bg-red-600"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 