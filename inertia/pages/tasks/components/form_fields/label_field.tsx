import React from 'react'
import { Task } from '../../types'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface LabelFieldProps {
  formData: Partial<Task>
  handleSelectChange: (name: string, value: string) => void
  canEdit: boolean
  labels: Array<{ id: number; name: string; color: string }>
  task: Task
}

export const LabelField: React.FC<LabelFieldProps> = ({ 
  formData, handleSelectChange, canEdit, labels, task 
}) => {
  // Lọc để tìm label hiện tại
  const currentLabel = labels.find(l => l.id === (formData.label_id || task.label_id))
  
  return (
    <div className="grid gap-2">
      <Label htmlFor="label_id">Nhãn</Label>
      {canEdit ? (
        <Select
          value={String(formData.label_id || '')}
          onValueChange={(value) => handleSelectChange('label_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Chọn nhãn" />
          </SelectTrigger>
          <SelectContent>
            {labels.map((label) => (
              <SelectItem key={label.id} value={String(label.id)}>
                <div className="flex items-center">
                  <span 
                    className="inline-block w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: label.color }}
                  ></span>
                  {label.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="p-2 border rounded-md flex items-center">
          {currentLabel ? (
            <>
              <span 
                className="inline-block w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: currentLabel.color }}
              ></span>
              {currentLabel.name}
            </>
          ) : (
            "Không xác định"
          )}
        </div>
      )}
    </div>
  )
} 