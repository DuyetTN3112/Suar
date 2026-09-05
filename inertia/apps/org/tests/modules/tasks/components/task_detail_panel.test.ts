import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import TaskDetailPanel from '@/apps/org/modules/tasks/components/detail/task_detail_panel.svelte'
import type { TaskDetail } from '@/apps/org/modules/tasks/types/index.svelte'

const { inertiaPage } = vi.hoisted(() => ({
  inertiaPage: {
    props: {
      auth: {
        user: {
          id: 'user-1',
        },
      },
    },
  },
}))

const { inertiaRouter } = vi.hoisted(() => ({
  inertiaRouter: { reload: vi.fn(), visit: vi.fn() },
}))

vi.mock('@inertiajs/svelte', () => ({
  page: inertiaPage,
  router: inertiaRouter,
}))

vi.mock('@/apps/org/shared/stores/translation.svelte', async () => {
  return import('#tests/frontend/translation_mock')
})

vi.mock(
  '@/apps/org/modules/tasks/components/detail/task_detail_metadata_sidebar.svelte',
  async () => {
    const stubModule = await import('../../../shared/test_stubs/empty_stub.svelte')
    return { default: stubModule.default }
  }
)

vi.mock('@/apps/org/modules/tasks/components/detail/task_execution_brief.svelte', async () => {
  const stubModule = await import('../../../shared/test_stubs/task_execution_brief_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/org/modules/tasks/components/detail/task_submission_panel.svelte', async () => {
  const stubModule = await import('../../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/org/modules/tasks/components/detail/task_files_tab.svelte', async () => {
  const stubModule = await import('../../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/org/modules/tasks/components/detail/task_discussion_tab.svelte', async () => {
  const stubModule = await import('../../../shared/test_stubs/task_discussion_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/org/shared/ui/dialog.svelte', async () => {
  const stubModule = await import('../../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/org/shared/ui/dialog_content.svelte', async () => {
  const stubModule = await import('../../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

describe('TaskDetailPanel', () => {
  it('keeps detail read-only and opens the dedicated editor when permitted', async () => {
    inertiaRouter.visit.mockClear()
    const task: TaskDetail = {
      id: 'task-1',
      title: 'Editable task',
      description: 'desc',
      status: 'todo',
      task_status_id: 'todo',
      label: 'feature',
      priority: 'medium',
      creator_id: 'user-2',
      due_date: null,
      created_at: '2026-07-09T00:00:00.000Z',
      updated_at: '2026-07-09T00:00:00.000Z',
      organization_id: 'org-1',
      project_id: 'project-1',
      permissions: { canEdit: true },
    }

    render(TaskDetailPanel, {
      props: {
        open: true,
        onOpenChange: vi.fn(),
        task,
        metadata: { statuses: [], labels: [], priorities: [], users: [] },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /edit|sửa/i }))
    expect(inertiaRouter.visit).toHaveBeenCalledWith('/tasks/task-1/edit')
    expect(screen.queryByRole('button', { name: /save changes|lưu thay đổi/i })).not.toBeInTheDocument()
  })

  it('wires stale brief recovery to an Inertia task-only reload that preserves panel state', async () => {
    inertiaRouter.reload.mockClear()
    const task: TaskDetail = {
      id: 'task-1',
      title: 'Task with stale brief',
      description: 'desc',
      status: 'todo',
      task_status_id: 'todo',
      label: 'feature',
      priority: 'medium',
      creator_id: 'user-2',
      acceptance_criteria: 'Code passes review',
      context_background: 'Operational context',
      due_date: null,
      created_at: '2026-07-09T00:00:00.000Z',
      updated_at: '2026-07-09T00:00:00.000Z',
      organization_id: 'org-1',
      project_id: 'project-1',
      assigned_to: 'user-1',
      resolved_brief: null,
      permissions: { canOpenWorkTabs: true, isAssignee: true },
      childTasks: [],
    }

    render(TaskDetailPanel, {
      props: {
        open: true,
        onOpenChange: vi.fn(),
        task,
        shellMode: 'organization',
        metadata: { statuses: [], labels: [], priorities: [], users: [] },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Reload brief' }))
    expect(inertiaRouter.reload).toHaveBeenCalledWith({
      only: ['task'],
    })
  })

  it('uses the host reload callback when the task panel is mounted from a board modal', async () => {
    inertiaRouter.reload.mockClear()
    const onReloadBrief = vi.fn()
    const task: TaskDetail = {
      id: 'task-1',
      title: 'Task with stale brief',
      description: 'desc',
      status: 'todo',
      task_status_id: 'todo',
      label: 'feature',
      priority: 'medium',
      creator_id: 'user-2',
      acceptance_criteria: 'Code passes review',
      context_background: 'Operational context',
      due_date: null,
      created_at: '2026-07-09T00:00:00.000Z',
      updated_at: '2026-07-09T00:00:00.000Z',
      organization_id: 'org-1',
      project_id: 'project-1',
      assigned_to: 'user-1',
      resolved_brief: null,
      permissions: { canOpenWorkTabs: true, isAssignee: true },
      childTasks: [],
    }

    render(TaskDetailPanel, {
      props: {
        open: true,
        onOpenChange: vi.fn(),
        task,
        onReloadBrief,
        shellMode: 'organization',
        metadata: { statuses: [], labels: [], priorities: [], users: [] },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Reload brief' }))
    expect(onReloadBrief).toHaveBeenCalledOnce()
    expect(inertiaRouter.reload).not.toHaveBeenCalled()
  })

  it('keeps the complete task work surface inside the board card room', () => {
    const task: TaskDetail = {
      id: 'task-1',
      title: 'Task with discussion',
      description: 'desc',
      status: 'todo',
      task_status_id: 'todo',
      label: 'feature',
      priority: 'medium',
      creator_id: 'user-2',
      acceptance_criteria: 'Code passes review',
      context_background: 'Operational context',
      due_date: null,
      created_at: '2026-07-09T00:00:00.000Z',
      updated_at: '2026-07-09T00:00:00.000Z',
      organization_id: 'org-1',
      project_id: 'project-1',
      assigned_to: 'user-1',
      permissions: {
        canOpenWorkTabs: true,
        canComment: true,
        isAssignee: true,
      },
      childTasks: [],
    }

    render(TaskDetailPanel, {
      props: {
        open: true,
        onOpenChange: vi.fn(),
        task,
        shellMode: 'organization',
        metadata: {
          statuses: [],
          labels: [],
          priorities: [],
          users: [],
        },
      },
    })

    expect(screen.getByRole('button', { name: /Tệp đính kèm.*Mở khi cần/i })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('task-drawer-work-surfaces')).not.toBeInTheDocument()
    expect(screen.queryByText(/Nộp bài/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Tệp/i)).toBeInTheDocument()
    expect(screen.getByTestId('task-discussion-stub')).toBeInTheDocument()
  })

  it('keeps discussion visible when the viewer lacks work-surface mutation access', () => {
    const task: TaskDetail = {
      id: 'task-1',
      title: 'Task without work access',
      description: 'desc',
      status: 'todo',
      task_status_id: 'todo',
      label: 'feature',
      priority: 'medium',
      creator_id: 'user-2',
      acceptance_criteria: 'Code passes review',
      context_background: 'Operational context',
      due_date: null,
      created_at: '2026-07-09T00:00:00.000Z',
      updated_at: '2026-07-09T00:00:00.000Z',
      organization_id: 'org-1',
      project_id: 'project-1',
      childTasks: [],
    }

    render(TaskDetailPanel, {
      props: {
        open: true,
        onOpenChange: vi.fn(),
        task,
        metadata: {
          statuses: [],
          labels: [],
          priorities: [],
          users: [],
        },
      },
    })

    expect(screen.queryByTestId('task-drawer-work-surfaces')).not.toBeInTheDocument()
    expect(screen.getByTestId('task-discussion-stub')).toBeInTheDocument()
  })
})
