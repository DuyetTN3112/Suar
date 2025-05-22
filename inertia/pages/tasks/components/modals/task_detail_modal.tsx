import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Task } from '../../types'
import { TaskDetailInfoTab } from './task_detail_info/task_detail_info_tab'
import { TaskDetailHistoryTab } from './task_detail_info/task_detail_history_tab'
import { TaskDetailMetadataTab } from './task_detail_info/task_detail_metadata_tab'
import { getPermissions } from '../task_detail_utils'
import { loadAuditLogs } from '../task_detail_api'
import { X, Info, History, Database } from 'lucide-react'

interface TaskDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  statuses: Array<{ id: number; name: string; color: string }>
  priorities: Array<{ id: number; name: string; color: string; value: number }>
  labels: Array<{ id: number; name: string; color: string }>
  users?: Array<{ id: number; first_name: string; last_name: string; full_name: string; avatar?: string }>
  onUpdate?: (updatedTask: Task) => void
  currentUser?: any
}

export function TaskDetailModal({
  open,
  onOpenChange,
  task,
  statuses = [],
  priorities = [],
  labels = [],
  users = [],
  onUpdate,
  currentUser = {}
}: TaskDetailModalProps) {
  const [formData, setFormData] = useState<Partial<Task>>({})
  const [activeTab, setActiveTab] = useState('info')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  
  // Debug logs
  useEffect(() => {
    console.log('TaskDetailModal - Modal open state changed:', open);
    console.log('TaskDetailModal - Selected task:', task);
  }, [open, task]);
  
  // Tìm ID của trạng thái hoàn thành (thường là "Completed" hoặc "Done")
  const completedStatusId = useMemo(() => {
    const completedStatus = statuses.find(status => 
      status.name.toLowerCase().includes('hoàn thành') || 
      status.name.toLowerCase().includes('completed') ||
      status.name.toLowerCase().includes('done')
    );
    return completedStatus?.id;
  }, [statuses]);
  
  // Xác định quyền người dùng
  const { canView, canEdit, canDelete, canMarkAsCompleted } = 
    getPermissions(currentUser, task);
  
  // Cập nhật dữ liệu khi task thay đổi
  useEffect(() => {
    if (task) {
      console.log('TaskDetailModal - Setting form data from task:', task);
      setFormData({
        ...task,
      })
      
      // Tải lịch sử thay đổi
      if (task.id) {
        loadAuditLogs(task.id)
          .then(logs => setAuditLogs(logs))
          .catch(error => console.error('Error loading audit logs:', error));
      }
    }
  }, [task])

  // Xử lý chuyển đổi tab
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
  }

  // Đóng modal
  const handleClose = () => {
    console.log('TaskDetailModal - Closing modal manually');
    onOpenChange(false)
  }

  // Xử lý cập nhật task
  const handleTaskUpdate = (updatedTask: Task | null) => {
    if (updatedTask === null) {
      // Task đã bị xóa
      handleClose();
    } else if (onUpdate) {
      onUpdate(updatedTask);
    }
  };

  // Hiển thị tiêu đề với mã và trạng thái nếu có
  const modalTitle = task 
    ? (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">#{task.id}</span>
        {task.status && (
          <span 
            className="inline-block w-3 h-3 rounded-full" 
            style={{ backgroundColor: task.status.color }}
          ></span>
        )}
        <span className="line-clamp-1">{task.title}</span>
        {canEdit && <span className="text-xs text-muted-foreground">(Chỉnh sửa)</span>}
      </div>
    )
    : 'Chi tiết nhiệm vụ';

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0">
        {task && (
          <>
            <div className="sticky top-0 z-10 bg-background p-6 pb-0 border-b">
              <div className="flex items-start justify-between mb-2">
                <DialogHeader className="flex-1">
                  <DialogTitle className="pr-8">{modalTitle}</DialogTitle>
                  <DialogDescription>
                    {canEdit 
                      ? 'Xem và chỉnh sửa thông tin nhiệm vụ' 
                      : 'Xem thông tin nhiệm vụ'}
                  </DialogDescription>
                </DialogHeader>
                <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Đóng</span>
                </DialogClose>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <div className="sticky top-[76px] z-10 bg-background border-b">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info" className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span>Thông tin</span>
                  </TabsTrigger>
                  <TabsTrigger value="metadata" className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span>Chi tiết</span>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    <span>Lịch sử</span>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="p-6 pt-4">
                <TabsContent value="info" className="mt-0">
                  <TaskDetailInfoTab
                    task={task}
                    formData={formData}
                    setFormData={setFormData}
                    isEditing={canEdit}
                    errors={errors}
                    setErrors={setErrors}
                    statuses={statuses}
                    priorities={priorities}
                    labels={labels}
                    users={users}
                    submitting={submitting}
                    setSubmitting={setSubmitting}
                    onUpdate={handleTaskUpdate}
                    canMarkAsCompleted={canMarkAsCompleted}
                    canDelete={canDelete}
                    completedStatusId={completedStatusId}
                  />
                </TabsContent>
                
                <TabsContent value="metadata" className="mt-0">
                  <TaskDetailMetadataTab
                    task={task}
                    users={users}
                  />
                </TabsContent>
                
                <TabsContent value="history" className="mt-0">
                  <TaskDetailHistoryTab 
                    auditLogs={auditLogs} 
                    task={task}
                  />
                </TabsContent>
              </div>
            </Tabs>
            
            <DialogFooter className="p-6 pt-2 border-t">
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Đóng
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
} 