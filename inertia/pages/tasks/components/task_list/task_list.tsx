import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from '@/components/ui/checkbox'
import { Task } from '../../types'
import { router } from '@inertiajs/react'
import { ChevronDown, ChevronRight, GitMerge, Clock, CalendarIcon, User, Trash2 } from 'lucide-react'
import { TaskListRow } from './task_list_row'
import { Button } from '@/components/ui/button'

type TaskListProps = {
  tasks: Task[]
  selectedTasks: number[]
  expandedTasks: number[]
  isTaskSelected: (taskId: number) => boolean
  isAllSelected: boolean
  handleSelectAll: (checked: boolean) => void
  handleSelectTask: (taskId: number, checked: boolean) => void
  toggleExpandTask: (taskId: number) => void
  isTaskExpanded: (taskId: number) => boolean
  currentUserInfo: {
    id?: string | number
    role?: string
    organization_id?: string | number
  }
  completedStatusId?: number
  formatDate: (dateString: string) => string
  onToggleStatus: (task: Task, newStatusId: number) => void
  onTaskClick?: (task: Task) => void
}

export function TaskList({
  tasks,
  selectedTasks,
  expandedTasks,
  isTaskSelected,
  isAllSelected,
  handleSelectAll,
  handleSelectTask,
  toggleExpandTask,
  isTaskExpanded,
  currentUserInfo,
  completedStatusId,
  formatDate,
  onToggleStatus,
  onTaskClick
}: TaskListProps) {
  
  // Helper để xác định task đã hoàn thành
  const isTaskCompleted = (task: Task) => {
    if (!completedStatusId) return false;
    
    // Kiểm tra status_id
    return task.status_id === completedStatusId || 
           (task.status?.name?.toLowerCase().includes('done') || 
            task.status?.name?.toLowerCase().includes('hoàn thành'));
  };

  // Kiểm tra có task con hay không
  const hasChildTasks = (task: Task) => {
    return task.childTasks && task.childTasks.length > 0;
  };

  // Chuyển đến trang task cha
  const navigateToParentTask = (taskId: number) => {
    router.get(`/tasks/${taskId}`);
  };

  // Xem chi tiết task con
  const viewSubtask = (taskId: number) => {
    router.get(`/tasks/${taskId}`);
  };

  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow className="h-9">
          <TableHead className="w-[30px] px-2 py-2">
            <Checkbox 
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
              className="h-4 w-4"
              aria-label="Select all tasks"
            />
          </TableHead>
          <TableHead className="w-[100px] px-2 py-2 text-xs">Task</TableHead>
          <TableHead className="px-2 py-2 text-xs">Title</TableHead>
          <TableHead className="w-[100px] px-2 py-2 text-xs">Status</TableHead>
          <TableHead className="w-[100px] px-2 py-2 text-xs">Label</TableHead>
          <TableHead className="w-[100px] px-2 py-2 text-xs">Priority</TableHead>
          <TableHead className="w-[150px] px-2 py-2 text-xs">Assigned To</TableHead>
          <TableHead className="w-[100px] px-2 py-2 text-xs">Created At</TableHead>
          <TableHead className="w-[100px] px-2 py-2 text-xs">Due Date</TableHead>
          <TableHead className="w-[30px] px-2 py-2"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="h-12 text-center text-xs">
              Không có nhiệm vụ nào phù hợp với bộ lọc
            </TableCell>
          </TableRow>
        ) : (
          tasks.map(task => (
            <TaskListRow
              key={task.id}
              task={task}
              isTaskSelected={isTaskSelected}
              handleSelectTask={handleSelectTask}
              hasChildTasks={hasChildTasks}
              isTaskExpanded={isTaskExpanded}
              toggleExpandTask={toggleExpandTask}
              isTaskCompleted={isTaskCompleted}
              currentUserInfo={currentUserInfo}
              formatDate={formatDate}
              onToggleStatus={onToggleStatus}
              onTaskClick={onTaskClick}
            />
          ))
        )}
      </TableBody>
    </Table>
  )
} 