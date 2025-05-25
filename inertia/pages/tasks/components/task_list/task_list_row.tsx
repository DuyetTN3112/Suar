import React from 'react'
import {
  TableRow,
  TableCell
} from "@/components/ui/table"
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Task } from '../../types'
import { ChildTaskRow } from './child_task_row'
import { TaskItemDeleteButton } from './task_item_delete_button'
import { TaskStatusCell } from './cells/status_cell'
import { TaskLabelCell } from './cells/label_cell'
import { TaskPriorityCell } from './cells/priority_cell'
import { TaskAssigneeCell } from './cells/assignee_cell'
import { TaskDateCell } from './cells/date_cell'
import { TaskDueDateCell } from './cells/due_date_cell'


type TaskListRowProps = {
  task: Task
  isTaskSelected: (taskId: number) => boolean
  handleSelectTask: (taskId: number, checked: boolean) => void
  hasChildTasks: (task: Task) => boolean
  isTaskExpanded: (taskId: number) => boolean
  toggleExpandTask: (taskId: number) => void
  isTaskCompleted: (task: Task) => boolean
  currentUserInfo: {
    id?: string | number
    role?: string
    organization_id?: string | number
  }
  formatDate: (dateString: string) => string
  onToggleStatus: (task: Task, newStatusId: number) => void
  onTaskClick?: (task: Task) => void
}

export function TaskListRow({
  task,
  isTaskSelected,
  handleSelectTask,
  hasChildTasks,
  isTaskExpanded,
  toggleExpandTask,
  isTaskCompleted,
  currentUserInfo,
  formatDate,
  onTaskClick
}: TaskListRowProps) {
  const isCompleted = isTaskCompleted(task);
  const statusName = task.status?.name?.toLowerCase() || '';
  const priorityName = task.priority?.name?.toLowerCase() || '';
  const hasChildren = hasChildTasks(task);
  const isExpanded = isTaskExpanded(task.id);

  // Xác định class và style dựa vào trạng thái
  const titleClass = isCompleted ? 'line-through text-muted-foreground' : '';

  // Hàm xử lý click vào task
  const handleTaskClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (onTaskClick) {
      onTaskClick(task);
    }
  };

  return (
    <React.Fragment>
      <TableRow className="min-h-[44px]">
        <TableCell className="px-2 py-1">
          <Checkbox
            id={`select-task-${task.id}`}
            checked={isTaskSelected(task.id)}
            onCheckedChange={(checked) => handleSelectTask(task.id, !!checked)}
            className="h-4 w-4"
          />
        </TableCell>
        <TableCell className="px-2 py-1 whitespace-nowrap text-xs">
          <div className="flex items-center gap-1">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleExpandTask(task.id);
                }}
                className="h-4 w-4 rounded hover:bg-muted flex items-center justify-center"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            )}
            <span>TASK-{task.id}</span>
          </div>
        </TableCell>
        <TableCell className="px-2 py-1 text-xs" onClick={handleTaskClick} style={{ cursor: 'pointer' }}>
          <div className={`flex flex-col ${titleClass}`}>
            <span className="font-medium">{task.title}</span>
            {task.description && (
              <span className="text-[11px] text-muted-foreground line-clamp-1">{task.description}</span>
            )}
          </div>
        </TableCell>
        <TableCell className="px-2 py-1">
          <TaskStatusCell task={task} statusName={statusName} />
        </TableCell>
        <TableCell className="px-2 py-1">
          <TaskLabelCell task={task} />
        </TableCell>
        <TableCell className="px-2 py-1">
          <TaskPriorityCell task={task} priorityName={priorityName} />
        </TableCell>
        <TableCell className="px-2 py-1 text-xs">
          <TaskAssigneeCell task={task} />
        </TableCell>
        <TableCell className="px-2 py-1 text-xs">
          <TaskDateCell task={task} formatDate={formatDate} />
        </TableCell>
        <TableCell className="px-2 py-1 text-xs">
          <TaskDueDateCell task={task} formatDate={formatDate} />
        </TableCell>
        <TableCell className="px-2 py-1">
          <TaskItemDeleteButton
            task={task}
            currentUser={currentUserInfo}
          />
        </TableCell>
      </TableRow>

      {/* Hiển thị Task con nếu có và đang mở rộng */}
      {isExpanded && hasChildren && task.childTasks && task.childTasks.map(childTask => (
        <ChildTaskRow
          key={`subtask-${childTask.id}`}
          childTask={childTask}
          isTaskSelected={isTaskSelected}
          handleSelectTask={handleSelectTask}
          isTaskCompleted={isTaskCompleted}
          formatDate={formatDate}
          currentUserInfo={currentUserInfo}
          onTaskClick={onTaskClick}
        />
      ))}
    </React.Fragment>
  )
}
