import { useState, useEffect, useMemo } from 'react'
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
import type { Task } from '../../types'
import { TaskDetailInfoTab } from './task_detail_info/task_detail_info_tab'
import { TaskDetailHistoryTab } from './task_detail_info/task_detail_history_tab'
import { getPermissions } from '../task_detail_utils'
import { loadAuditLogs } from '../task_detail_api'
import { X, Info, History } from 'lucide-react'
import useTranslation from '@/hooks/use_translation'

interface TaskDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  statuses: Array<{ id: number; name: string; color: string }>
  priorities: Array<{ id: number; name: string; color: string; value: number }>
  labels: Array<{ id: number; name: string; color: string }>
  users?: Array<{ id: number; username: string; email: string }>
  onUpdate?: (updatedTask: Task) => void
  currentUser?: unknown
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
  const { t } = useTranslation()
  const [formData, setFormData] = useState<Partial<Task>>({})
  const [activeTab, setActiveTab] = useState('info')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [auditLogs, setAuditLogs] = useState<unknown[]>([])

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

  // Chuẩn hóa dữ liệu task từ các định dạng khác nhau của backend
  const normalizeTaskData = (taskData: Task | null) => {
    if (!taskData) return null;

    // Chuẩn hóa các ID thành dạng đồng nhất
    return {
      ...taskData,
      // Chuẩn hóa ID của status
      status_id: taskData.status_id || taskData.statusId || (taskData.status?.id),
      // Chuẩn hóa ID của priority
      priority_id: taskData.priority_id || taskData.priorityId || (taskData.priority?.id),
      // Chuẩn hóa ID của label
      label_id: taskData.label_id || taskData.labelId || (taskData.label?.id),
      // Chuẩn hóa ID người được giao
      assigned_to: taskData.assigned_to || taskData.assignedTo || taskData.assignedToId,
      // Lưu các liên kết đến đối tượng đầy đủ
      status: taskData.status,
      priority: taskData.priority,
      label: taskData.label,
      assignee: taskData.assignee
    };
  };

  // Cập nhật dữ liệu khi task thay đổi
  useEffect(() => {
    if (task) {
      // Chuẩn hóa dữ liệu trước khi đặt vào formData
      const normalizedTask = normalizeTaskData(task);
      setFormData(normalizedTask || {});

      // Tải lịch sử thay đổi
      if (task.id) {
        loadAuditLogs(task.id)
          .then(logs => setAuditLogs(logs))
          .catch(error => {
            // Only log in development
            if (import.meta.env.NODE_ENV === 'development') {
              console.error('Error loading audit logs:', error);
            }
          });
      }
    }
  }, [task])

  // Xử lý chuyển đổi tab
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
  }

  // Đóng modal
  const handleClose = () => {
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

  // Tìm phần hiển thị tiêu đề modal và sửa đổi để hiển thị rõ hơn
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
      </div>
    )
    : t('task.task_details', {}, 'Chi tiết nhiệm vụ');

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
                      ? <span className="flex items-center gap-1">
                          <span>{t('task.view_and_edit_task', {}, 'Xem và chỉnh sửa thông tin nhiệm vụ')}</span>
                          <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full font-medium">{t('common.edit', {}, 'Chỉnh sửa')}</span>
                        </span>
                      : t('task.view_task_info', {}, 'Xem thông tin nhiệm vụ')}
                  </DialogDescription>
                </DialogHeader>
                <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                  <X className="h-4 w-4" />
                  <span className="sr-only">{t('common.close', {}, 'Đóng')}</span>
                </DialogClose>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <div className="sticky top-[76px] z-10 bg-background border-b">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="info" className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span>{t('task.information', {}, 'Thông tin')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    <span>{t('task.history', {}, 'Lịch sử')}</span>
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
                {t('common.close', {}, 'Đóng')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
