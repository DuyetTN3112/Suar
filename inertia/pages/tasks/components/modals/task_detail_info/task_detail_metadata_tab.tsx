import React from 'react'
import { formatDate } from '../../../utils/task_formatter'
import { getAvatarInitials } from '../../task_detail_utils'
import { Task } from '../../../types'
import { 
  Calendar, 
  User, 
  Clock, 
  FileText, 
  Briefcase, 
  Hash, 
  GitMerge, 
  Users,
  AlarmClock,
  Timer
} from 'lucide-react'

interface TaskDetailMetadataTabProps {
  task: Task
  users?: Array<{ 
    id: number; 
    first_name: string; 
    last_name: string; 
    full_name: string; 
    avatar?: string 
  }>
}

export function TaskDetailMetadataTab({ task, users = [] }: TaskDetailMetadataTabProps) {
  // Tìm thông tin người tạo và người được giao
  const creator = users.find(user => Number(user.id) === Number(task.created_by));
  const assignee = users.find(user => Number(user.id) === Number(task.assigned_to));
  
  // Tính số lượng task con
  const childTasksCount = task.childTasks?.length || 0;
  
  // Định dạng thời gian ước tính và thực tế
  const formatTime = (minutes?: number) => {
    if (!minutes) return '0h';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };
  
  return (
    <div className="space-y-6 py-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Người tạo */}
        <div className="bg-muted/30 p-3 rounded-md">
          <div className="flex items-center mb-2">
            <User className="h-4 w-4 mr-2 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Người tạo</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs">
              {getAvatarInitials(creator?.full_name)}
            </div>
            <span className="text-sm font-medium">{creator?.full_name || 'Không có thông tin'}</span>
          </div>
        </div>
        
        {/* Người được giao */}
        <div className="bg-muted/30 p-3 rounded-md">
          <div className="flex items-center mb-2">
            <Users className="h-4 w-4 mr-2 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground">Người được giao</p>
          </div>
          <div className="flex items-center gap-2">
            {assignee ? (
              <>
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs">
                  {getAvatarInitials(assignee?.full_name)}
                </div>
                <span className="text-sm font-medium">{assignee?.full_name}</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Chưa được giao</span>
            )}
          </div>
        </div>
        
        {/* Ngày & thời gian */}
        <div className="bg-muted/30 p-3 rounded-md">
          <div className="space-y-3">
            <div>
              <div className="flex items-center mb-1">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Ngày tạo</p>
              </div>
              <p className="text-sm ml-6">{formatDate(task.created_at)}</p>
            </div>
            
            <div>
              <div className="flex items-center mb-1">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Cập nhật lần cuối</p>
              </div>
              <p className="text-sm ml-6">{formatDate(task.updated_at)}</p>
            </div>
            
            <div>
              <div className="flex items-center mb-1">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Ngày hạn</p>
              </div>
              <p className="text-sm ml-6">{task.due_date ? formatDate(task.due_date) : 'Không có'}</p>
            </div>
          </div>
        </div>
        
        {/* Thông tin thời gian */}
        <div className="bg-muted/30 p-3 rounded-md">
          <div className="space-y-3">
            <div>
              <div className="flex items-center mb-1">
                <AlarmClock className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Thời gian ước tính</p>
              </div>
              <p className="text-sm ml-6">{formatTime(task.estimated_time) || 'Không có'}</p>
            </div>
            
            <div>
              <div className="flex items-center mb-1">
                <Timer className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Thời gian thực tế</p>
              </div>
              <p className="text-sm ml-6">{formatTime(task.actual_time) || 'Không có'}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Thông tin khác */}
      <div className="bg-muted/30 p-3 rounded-md">
        <h3 className="text-sm font-medium mb-3">Thông tin khác</h3>
        
        <div className="space-y-3">
          <div className="flex items-start">
            <Hash className="h-4 w-4 mr-2 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">ID</p>
              <p className="text-sm">{task.id}</p>
            </div>
          </div>
          
          <div className="flex items-start">
            <Briefcase className="h-4 w-4 mr-2 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Tổ chức</p>
              <p className="text-sm">{task.organization?.name || (task.organization_id ? `ID: ${task.organization_id}` : 'Không có')}</p>
            </div>
          </div>
          
          {task.parent_task_id && (
            <div className="flex items-start">
              <GitMerge className="h-4 w-4 mr-2 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Task cha</p>
                <p className="text-sm">
                  {task.parentTask ? `#${task.parentTask.id}: ${task.parentTask.title}` : `ID: ${task.parent_task_id}`}
                </p>
              </div>
            </div>
          )}
          
          {childTasksCount > 0 && (
            <div className="flex items-start">
              <GitMerge className="h-4 w-4 mr-2 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Task con</p>
                <p className="text-sm">{childTasksCount} task con</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 