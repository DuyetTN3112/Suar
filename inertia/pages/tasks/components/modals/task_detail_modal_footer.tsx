import React from 'react'
import { DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

type TaskDetailModalFooterProps = {
  canDelete: boolean
  canMarkAsCompleted: boolean
  canEdit: boolean
  isEditing: boolean
  submitting: boolean
  onSoftDelete: () => void
  onMarkAsCompleted: () => void
  onSubmit: () => void
  onToggleEdit: () => void
  onClose: () => void
}

export function TaskDetailModalFooter({
  canDelete,
  canMarkAsCompleted,
  canEdit,
  isEditing,
  submitting,
  onSoftDelete,
  onMarkAsCompleted,
  onSubmit,
  onToggleEdit,
  onClose
}: TaskDetailModalFooterProps) {
  return (
    <DialogFooter className="flex sm:justify-between flex-col sm:flex-row gap-3">
      {canDelete && (
        <div className="flex gap-2">
          <Button variant="destructive" onClick={onSoftDelete}>
            Xóa
          </Button>
        </div>
      )}
      <div className="flex gap-2">
        {canMarkAsCompleted && !isEditing && (
          <Button variant="secondary" onClick={onMarkAsCompleted}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Đánh dấu hoàn thành
          </Button>
        )}
        {canEdit && isEditing && (
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        )}
        {canEdit && !isEditing && (
          <Button variant="secondary" onClick={onToggleEdit}>
            Sửa
          </Button>
        )}
        {isEditing ? (
          <Button variant="outline" onClick={onToggleEdit}>
            Hủy
          </Button>
        ) : (
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        )}
      </div>
    </DialogFooter>
  )
} 