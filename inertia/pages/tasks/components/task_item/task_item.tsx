import React, { useState } from 'react'
import { TaskItemProps } from '../../types'
import { Trash2 } from 'lucide-react' 
import { Button } from '@/components/ui/button'
import { canDeleteTask } from '../../utils/task_permissions'
import { TaskDetailModal } from '../modals/task_detail_modal'
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

export function TaskItem({ 
  task, 
  completedStatusId, 
  pendingStatusId, 
  onToggleStatus, 
  formatDate,
  statuses = [],
  priorities = [],
  labels = [],
  users = [],
  currentUser
}: TaskItemProps) {
  const isCompleted = task.status_id === completedStatusId;
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const handleTaskUpdate = (updatedTask: any) => {
    console.log('Task đã được cập nhật:', updatedTask);
  };
  
  // Hàm mở modal chi tiết task
  const openTaskDetail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDetailModal(true);
  };
  
  // Mở dialog xác nhận xóa
  const openDeleteConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };
  
  // Xử lý xóa task
  const confirmDeleteTask = () => {
    router.delete(`/tasks/${task.id}`, {
      onSuccess: () => {
        // Đóng dialog xác nhận
        setDeleteDialogOpen(false);
      },
      onError: (errors: any) => {
        // Xử lý lỗi
        console.error('Lỗi khi xóa task:', errors);
        alert('Có lỗi xảy ra khi xóa nhiệm vụ. Vui lòng thử lại.');
      },
      preserveScroll: true, 
      preserveState: false,
      replace: true,
      only: ['tasks']
    });
  };
  
  return (
    <>
      <div className="flex items-center justify-between w-full">
        <div 
          className="flex-1 cursor-pointer" 
          onClick={openTaskDetail}
        >
          <div className="flex flex-col">
            <span className={`text-xs ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </span>
            {task.description && (
              <span className="text-xs text-muted-foreground line-clamp-1 mt-1">
                {task.description}
              </span>
            )}
          </div>
        </div>
        
        {canDeleteTask(task, currentUser) && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5 ml-2"
            onClick={openDeleteConfirm}
            title="Xóa nhiệm vụ"
          >
            <Trash2 className="h-3 w-3 text-red-500" />
          </Button>
        )}
      </div>
      
      {/* Modal Chi tiết Task */}
      <TaskDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        task={task}
        statuses={statuses}
        priorities={priorities}
        labels={labels}
        users={users}
        onUpdate={handleTaskUpdate}
        currentUser={currentUser}
      />
      
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