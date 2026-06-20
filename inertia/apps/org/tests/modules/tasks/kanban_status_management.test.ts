/* eslint-disable import-x/order */
import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import KanbanBoard from '@/apps/org/modules/tasks/components/views/kanban/kanban_board.svelte'
import type { TaskStore } from '@/apps/org/modules/tasks/stores/tasks.svelte'

function makeStore(): TaskStore {
  return {
    isLoading: false,
    isOptimisticActive: false,
    totalCount: 0,
    filteredCount: 0,
    sortedTasks: [],
    tasksByStatus: {
      'qa-id': [],
    },
    displayProperties: {
      priority: true,
      label: true,
      assignee: true,
      dueDate: true,
    },
    clearFilters: vi.fn(),
    moveTaskStatus: vi.fn(),
    isTaskMutating: vi.fn(() => false),
  } as unknown as TaskStore
}

describe('Kanban status management', () => {
  it('lets workflow managers open rename from a board column', async () => {
    const onRenameStatus = vi.fn()

    render(KanbanBoard, {
      props: {
        store: makeStore(),
        metadata: {
          statuses: [
            {
              value: 'qa-id',
              label: 'Ready for QA',
              color: '#0F766E',
              slug: 'ready_for_qa',
              category: 'in_progress',
            },
          ],
          labels: [],
          priorities: [],
          users: [],
        },
        canManageStatuses: true,
        canCreateTask: true,
        canDeleteStatus: () => true,
        onRenameStatus,
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Đổi tên trạng thái Ready for QA' }))

    expect(onRenameStatus).toHaveBeenCalledWith({ status: 'qa-id', label: 'Ready for QA' })
  })

  it('persists workflow status column order after drag and drop', async () => {
    const onReorderStatuses = vi.fn()
    const data = new Map<string, string>()
    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      types: [] as string[],
      setData(type: string, value: string) {
        data.set(type, value)
        this.types = [...data.keys()]
      },
      getData(type: string) {
        return data.get(type) ?? ''
      },
    }

    render(KanbanBoard, {
      props: {
        store: makeStore(),
        metadata: {
          statuses: [
            {
              value: 'todo-id',
              label: 'Todo',
              color: '#64748B',
            },
            {
              value: 'qa-id',
              label: 'Ready for QA',
              color: '#0F766E',
            },
          ],
          labels: [],
          priorities: [],
          users: [],
        },
        canManageStatuses: true,
        canCreateTask: true,
        canDeleteStatus: () => true,
        onReorderStatuses,
      },
    })

    const dragHandles = screen.getAllByRole('button', {
      name: 'Kéo để đổi vị trí cột trạng thái',
    })
    const todoColumn = screen.getByRole('region', { name: 'Todo column' })
    const qaDragHandle = dragHandles[1]
    expect(qaDragHandle).toBeDefined()

    await fireEvent.dragStart(qaDragHandle as Element, { dataTransfer })
    await fireEvent.drop(todoColumn, { dataTransfer })

    expect(onReorderStatuses).toHaveBeenCalledWith({
      orderedStatusIds: ['qa-id', 'todo-id'],
      previousStatusIds: ['todo-id', 'qa-id'],
    })
  })
})
