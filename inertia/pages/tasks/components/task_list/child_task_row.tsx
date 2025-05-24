import React, { useState } from 'react'
import {
  TableRow,
  TableCell
} from "@/components/ui/table"
import { Checkbox } from '@/components/ui/checkbox'
import { Task } from '../../types'
import { TaskItemDeleteButton } from './task_item_delete_button'
import { StatusCell } from './cells/child/status_cell'
import { LabelCell } from './cells/child/label_cell'
import { PriorityCell } from './cells/child/priority_cell'
import { AssigneeCell } from './cells/child/assignee_cell'
import { DateCell } from './cells/child/date_cell'
import { DueDateCell } from './cells/child/due_date_cell'
import { TaskDetailModal } from '../modals/task_detail_modal'

type ChildTaskRowProps = {
  childTask: Task
  isTaskSelected: (taskId: number) => boolean
  handleSelectTask: (taskId: number, checked: boolean) => void
  isTaskCompleted: (task: Task) => boolean
  formatDate: (dateString: string) => string
  currentUserInfo: any
}

export function ChildTaskRow({
  childTask,
  isTaskSelected,
  handleSelectTask,
  formatDate,
  currentUserInfo
}: ChildTaskRowProps) {
  const statusName = childTask.status?.name?.toLowerCase() || '';
  const priorityName = childTask.priority?.name?.toLowerCase() || '';
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Hàm mở modal chi tiết task
  const openTaskDetail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDetailModal(true);
  };

  return (
    <>
      <TableRow className="min-h-[40px] bg-muted/30">
        <TableCell className="px-2 py-1">
          <Checkbox
            id={`select-subtask-${childTask.id}`}
            checked={isTaskSelected(childTask.id)}
            onCheckedChange={(checked) => handleSelectTask(childTask.id, !!checked)}
            className="h-4 w-4"
          />
        </TableCell>
        <TableCell className="px-2 py-1 whitespace-nowrap text-xs">
          <div className="pl-4 flex items-center">
            <span className="text-muted-foreground">↳</span>
            <span className="ml-1">TASK-{childTask.id}</span>
          </div>
        </TableCell>
        <TableCell className="px-2 py-1 text-xs" onClick={openTaskDetail} style={{ cursor: 'pointer' }}>
          <div className="flex flex-col">
            <span className="truncate">{childTask.title}</span>
            {childTask.description && (
              <span className="text-[11px] text-muted-foreground line-clamp-1">{childTask.description}</span>
            )}
          </div>
        </TableCell>
        <TableCell className="px-2 py-1">
          <StatusCell status={childTask.status} statusName={statusName} />
        </TableCell>
        <TableCell className="px-2 py-1">
          <LabelCell label={childTask.label} />
        </TableCell>
        <TableCell className="px-2 py-1">
          <PriorityCell priority={childTask.priority} priorityName={priorityName} />
        </TableCell>
        <TableCell className="px-2 py-1 text-xs">
          <AssigneeCell assignee={childTask.assignee} />
        </TableCell>
        <TableCell className="px-2 py-1 text-xs">
          <DateCell createdAt={childTask.created_at} formatDate={formatDate} />
        </TableCell>
        <TableCell className="px-2 py-1 text-xs">
          <DueDateCell dueDate={childTask.due_date} formatDate={formatDate} />
        </TableCell>
        <TableCell className="px-2 py-1">
          <TaskItemDeleteButton
            task={childTask}
            currentUser={currentUserInfo}
          />
        </TableCell>
      </TableRow>

      {/* Modal Chi tiết Task */}
      <TaskDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        task={childTask}
        statuses={childTask.status ? [childTask.status] : []}
        priorities={childTask.priority ? [childTask.priority] : []}
        labels={childTask.label ? [childTask.label] : []}
        users={[]}
        currentUser={currentUserInfo}
      />
    </>
  );
}
