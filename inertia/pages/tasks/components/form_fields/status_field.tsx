import React from 'react'
import { Task } from '../../types'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface StatusFieldProps {
  formData: Partial<Task>
  handleSelectChange: (name: string, value: string) => void
  isEditing: boolean
  statuses: Array<{ id: number; name: string; color: string }>
  task: Task
}

export const StatusField: React.FC<StatusFieldProps> = ({ 
  formData, handleSelectChange, isEditing, statuses, task 
}) => {
  return (
    <div className="grid gap-2">
      <Label htmlFor="status_id">Trạng thái</Label>
      {isEditing ? (
        <Select
          value={String(formData.status_id || '')}
          onValueChange={(value) => handleSelectChange('status_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chọn trạng thái" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status.id} value={String(status.id)}>
                <div className="flex items-center">
                  <span 
                    className="inline-block w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: status.color }}
                  ></span>
                  {status.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="p-2 border rounded-md flex items-center">
          {task.status ? (
            <>
              <span 
                className="inline-block w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: task.status.color }}
              ></span>
              {task.status.name}
            </>
          ) : (
            "Không xác định"
          )}
        </div>
      )}
    </div>
  )
} 