import React from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { Task } from '../../types'
import { router } from '@inertiajs/react'

type TaskItemDeleteButtonProps = {
  task: Task
  currentUser: {
    id?: string | number
    role?: string
    organization_id?: string | number
  }
}

export function TaskItemDeleteButton({ task, currentUser }: TaskItemDeleteButtonProps) {
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

  // Xử lý xóa task
  const handleDeleteTask = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (confirm(`Bạn có chắc chắn muốn xóa nhiệm vụ "${task.title}"?`)) {
      router.delete(`/tasks/${task.id}`)
    }
  }
  
  // Kiểm tra quyền và hiển thị nút
  const hasPermission = canDeleteTask()
  
  // Chỉ hiển thị nút nếu có quyền xóa
  if (!hasPermission) return null
  
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-5 w-5"
      onClick={handleDeleteTask}
      title="Xóa nhiệm vụ"
    >
      <Trash2 className="h-3 w-3 text-red-500" />
    </Button>
  )
} 