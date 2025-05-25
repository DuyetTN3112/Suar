import React from 'react'
import type { Task } from '../../types'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PriorityFieldProps {
  formData: Partial<Task>
  handleSelectChange: (name: string, value: string) => void
  canEdit: boolean
  priorities: Array<{ id: number; name: string; color: string; value: number }>
  task: Task
}

export const PriorityField: React.FC<PriorityFieldProps> = ({
  formData, handleSelectChange, canEdit, priorities, task
}) => {
  // Lọc để tìm priority hiện tại
  const currentPriority = priorities.find(p => p.id === (formData.priority_id || task.priority_id))

  return (
    <div className="grid gap-2">
      <Label htmlFor="priority_id">Độ ưu tiên</Label>
      {canEdit ? (
        <Select
          value={String(formData.priority_id || '')}
          onValueChange={(value) => handleSelectChange('priority_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chọn độ ưu tiên" />
          </SelectTrigger>
          <SelectContent>
            {priorities.map((priority) => (
              <SelectItem key={priority.id} value={String(priority.id)}>
                <div className="flex items-center">
                  <span
                    className="inline-block w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: priority.color }}
                  ></span>
                  {priority.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="p-2 border rounded-md flex items-center">
          {currentPriority ? (
            <>
              <span
                className="inline-block w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: currentPriority.color }}
              ></span>
              {currentPriority.name}
            </>
          ) : (
            "Không xác định"
          )}
        </div>
      )}
    </div>
  )
}
