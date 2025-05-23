import React from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Task } from '../../../types'
import { DatePicker } from '@/components/ui/date-picker'
import { cn } from '@/lib/utils'

interface TaskDetailFieldsProps {
  task: Task
  formData: Partial<Task>
  isEditing: boolean
  errors: Record<string, string>
  statuses: Array<{ id: number; name: string; color: string }>
  priorities: Array<{ id: number; name: string; color: string; value: number }>
  labels: Array<{ id: number; name: string; color: string }>
  users: Array<{ id: number; first_name: string; last_name: string; full_name: string; avatar?: string }>
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleSelectChange: (name: string, value: string) => void
  handleDateChange: (date: Date | undefined) => void
}

export function TaskDetailFields({
  task,
  formData,
  isEditing,
  errors,
  statuses,
  priorities,
  labels,
  users,
  handleChange,
  handleSelectChange,
  handleDateChange
}: TaskDetailFieldsProps) {
  // Format lại ngày hạn để hiển thị trong DatePicker
  const dueDate = formData.due_date ? new Date(formData.due_date) : undefined
  
  // Debug log để xem dữ liệu task đang có
  console.log("TaskDetailFields - formData:", formData);
  console.log("TaskDetailFields - task:", task);
  
  // Lấy ID từ các trường khác nhau (hỗ trợ nhiều định dạng backend)
  const statusId = formData.status_id || formData.statusId || task.status?.id;
  const priorityId = formData.priority_id || formData.priorityId || task.priority?.id;
  const labelId = formData.label_id || formData.labelId || task.label?.id;
  const assignedToId = formData.assigned_to || formData.assignedTo || formData.assignedToId;
  
  console.log("TaskDetailFields - IDs:", { 
    statusId, 
    priorityId, 
    labelId, 
    assignedToId
  });
  
  // Tìm các đối tượng hiện tại để hiển thị
  const currentStatus = statuses.find(s => s.id === Number(statusId)) || task.status;
  const currentPriority = priorities.find(p => p.id === Number(priorityId)) || task.priority;
  const currentLabel = labels.find(l => l.id === Number(labelId)) || task.label;
  const currentAssignee = users.find(u => u.id === Number(assignedToId)) || task.assignee;
  
  console.log("TaskDetailFields - Current objects:", { 
    currentStatus, 
    currentPriority, 
    currentLabel, 
    currentAssignee 
  });
  
  // Format ngày hạn để hiển thị khi không ở chế độ chỉnh sửa
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Chưa thiết lập';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    } catch (error) {
      return 'Không xác định';
    }
  };
  
  // Xử lý giá trị mặc định cho các trường Select
  const getStatusIdValue = () => {
    const value = formData.status_id || formData.statusId || (task.status ? task.status.id : '');
    return String(value);
  };
  
  const getPriorityIdValue = () => {
    const value = formData.priority_id || formData.priorityId || (task.priority ? task.priority.id : '');
    return String(value);
  };
  
  const getLabelIdValue = () => {
    const value = formData.label_id || formData.labelId || (task.label ? task.label.id : '');
    return String(value);
  };
  
  const getAssignedToValue = () => {
    const value = formData.assigned_to || formData.assignedTo || formData.assignedToId || '';
    return String(value);
  };
  
  return (
    <div className="space-y-6">
      {/* Tiêu đề và mô tả */}
      <section>
        <div className="space-y-2">
          <Label htmlFor="title">Tiêu đề</Label>
          {isEditing ? (
            <>
              <Input
                id="title"
                name="title"
                value={formData.title || ''}
                onChange={handleChange}
                placeholder="Nhập tiêu đề nhiệm vụ"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-xs text-red-500">{errors.title}</p>
              )}
            </>
          ) : (
            <p className="text-sm border px-3 py-2 rounded-md bg-muted/20">{formData.title}</p>
          )}
        </div>
        
        <div className="space-y-2 mt-4">
          <Label htmlFor="description">Mô tả</Label>
          {isEditing ? (
            <Textarea
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              placeholder="Mô tả chi tiết về nhiệm vụ"
              rows={3}
            />
          ) : (
            <div className="text-sm border px-3 py-2 rounded-md bg-muted/20 whitespace-pre-wrap min-h-[60px]">
              {formData.description || 'Không có mô tả'}
            </div>
          )}
        </div>
      </section>
      
      {/* Các trường thông tin khác */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cột trái */}
        <div className="space-y-4">
          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status_id">Trạng thái</Label>
            {isEditing ? (
              <>
                <Select
                  value={getStatusIdValue()}
                  onValueChange={(value) => handleSelectChange('status_id', value)}
                >
                  <SelectTrigger id="status_id" className={errors.status_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.id} value={String(status.id)}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full" 
                            style={{ backgroundColor: status.color || '#888' }}
                          ></div>
                          {status.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.status_id && (
                  <p className="text-xs text-red-500">{errors.status_id}</p>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 border px-3 py-2 rounded-md bg-muted/20">
                {currentStatus && (
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: currentStatus.color || '#888' }}
                  ></div>
                )}
                <span>{currentStatus?.name || 'Không có trạng thái'}</span>
              </div>
            )}
          </div>
          
          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority_id">Độ ưu tiên</Label>
            {isEditing ? (
              <Select
                value={getPriorityIdValue()}
                onValueChange={(value) => handleSelectChange('priority_id', value)}
              >
                <SelectTrigger id="priority_id">
                  <SelectValue placeholder="Chọn độ ưu tiên" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority.id} value={String(priority.id)}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: priority.color || '#888' }}
                        ></div>
                        {priority.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 border px-3 py-2 rounded-md bg-muted/20">
                {currentPriority && (
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: currentPriority.color || '#888' }}
                  ></div>
                )}
                <span>{currentPriority?.name || 'Không có độ ưu tiên'}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Cột phải */}
        <div className="space-y-4">
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="label_id">Nhãn</Label>
            {isEditing ? (
              <Select
                value={getLabelIdValue()}
                onValueChange={(value) => handleSelectChange('label_id', value)}
              >
                <SelectTrigger id="label_id">
                  <SelectValue placeholder="Chọn nhãn" />
                </SelectTrigger>
                <SelectContent>
                  {labels.map((label) => (
                    <SelectItem key={label.id} value={String(label.id)}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: label.color || '#888' }}
                        ></div>
                        {label.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 border px-3 py-2 rounded-md bg-muted/20">
                {currentLabel && (
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: currentLabel.color || '#888' }}
                  ></div>
                )}
                <span>{currentLabel?.name || 'Không có nhãn'}</span>
              </div>
            )}
          </div>
          
          {/* Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="assigned_to">Giao cho</Label>
            {isEditing ? (
              <Select
                value={getAssignedToValue()}
                onValueChange={(value) => handleSelectChange('assigned_to', value)}
              >
                <SelectTrigger id="assigned_to">
                  <SelectValue placeholder="Chọn người thực hiện" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.full_name || `${user.first_name} ${user.last_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="border px-3 py-2 rounded-md bg-muted/20">
                {currentAssignee ? 
                  (currentAssignee.full_name || currentAssignee.fullName || `${currentAssignee.first_name || currentAssignee.firstName || ''} ${currentAssignee.last_name || currentAssignee.lastName || ''}`.trim()) : 
                  'Chưa giao cho ai'
                }
              </div>
            )}
          </div>
        </div>
      </section>
      
      {/* Due Date */}
      <section>
        <div className="space-y-2">
          <Label htmlFor="due_date">Ngày hạn</Label>
          {isEditing ? (
            <DatePicker
              date={dueDate}
              onSelect={handleDateChange}
            />
          ) : (
            <div className="border px-3 py-2 rounded-md bg-muted/20">
              {formData.due_date ? formatDate(formData.due_date) : 'Chưa thiết lập ngày hạn'}
            </div>
          )}
        </div>
      </section>
    </div>
  )
} 