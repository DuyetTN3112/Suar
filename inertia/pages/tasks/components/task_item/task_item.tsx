import React, { useState } from 'react'
import { TaskItemProps } from '../../types'
import { Trash2 } from 'lucide-react' 
import { Button } from '@/components/ui/button'
import { canDeleteTask } from '../../utils/task_permissions'
import { TaskDetailModal } from '../modals/task_detail_modal'
import { router } from '@inertiajs/react'

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
  
  const handleTaskUpdate = (updatedTask: any) => {
    console.log('Task đã được cập nhật:', updatedTask);
  };
  
  // Hàm mở modal chi tiết task
  const openTaskDetail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDetailModal(true);
  };
  
  // Xử lý xóa task
  const handleDeleteTask = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirm('Bạn có chắc chắn muốn xóa nhiệm vụ này?')) {
      router.delete(`/tasks/${task.id}`);
    }
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
            onClick={handleDeleteTask}
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
    </>
  )
} 