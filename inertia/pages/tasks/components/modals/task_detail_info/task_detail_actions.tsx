import React from 'react'
import { Button } from '@/components/ui/button'
import { Task } from '../../../types'
import { Save, Trash2, CheckCircle, AlertCircle } from 'lucide-react'

interface TaskDetailActionsProps {
  task: Task
  formData: Partial<Task>
  submitting: boolean
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onUpdate?: (updatedTask: Task) => void
  onSubmit: () => void
  canMarkAsCompleted?: boolean
  canDelete?: boolean
  completedStatusId?: number
}

export function TaskDetailActions({
  task,
  formData,
  submitting,
  setSubmitting,
  setErrors,
  onUpdate,
  onSubmit,
  canMarkAsCompleted = false,
  canDelete = false,
  completedStatusId
}: TaskDetailActionsProps) {
  const handleMarkCompleted = async () => {
    if (!task?.id || !completedStatusId) return
    
    setSubmitting(true)
    
    try {
      const response = await fetch(`/tasks/${task.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({ status_id: completedStatusId })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (onUpdate) {
          onUpdate(data.data)
        }
      } else {
        const errorData = await response.json()
        setErrors(errorData.errors || {})
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái nhiệm vụ:', error)
    } finally {
      setSubmitting(false)
    }
  }
  
  const handleDelete = async () => {
    if (!task?.id || !window.confirm('Bạn có chắc chắn muốn xóa nhiệm vụ này không?')) return
    
    setSubmitting(true)
    
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        }
      })
      
      if (response.ok) {
        // Thành công - thông báo cho parent component
        if (onUpdate) {
          // Dùng null để thông báo rằng task đã bị xóa
          onUpdate(null as any)
        }
      } else {
        const errorData = await response.json()
        setErrors(errorData.errors || {})
        console.error('Lỗi khi xóa nhiệm vụ:', errorData)
      }
    } catch (error) {
      console.error('Lỗi khi xóa nhiệm vụ:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const isTaskCompleted = task.status_id === completedStatusId

  return (
    <div className="flex justify-between gap-2 mt-4">
      <div className="flex-1">
        {canDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={submitting}
            className="mr-2"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Xóa nhiệm vụ
          </Button>
        )}
      </div>
      
      <div className="flex gap-2">
        {canMarkAsCompleted && !isTaskCompleted && (
          <Button
            type="button"
            variant="outline"
            onClick={handleMarkCompleted}
            disabled={submitting}
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Hoàn thành
          </Button>
        )}
        
        {canMarkAsCompleted && isTaskCompleted && (
          <Button
            type="button"
            variant="outline"
            onClick={() => alert('Chức năng này đang được phát triển')}
            disabled={submitting}
            className="border-orange-500 text-orange-500 hover:bg-orange-50"
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Mở lại nhiệm vụ
          </Button>
        )}
        
        <Button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
        >
          <Save className="h-4 w-4 mr-1" />
          {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </div>
    </div>
  )
} 