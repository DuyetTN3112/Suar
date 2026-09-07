import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import TaskDetailPanel from '@/apps/user/modules/tasks/components/detail/task_detail_panel.svelte'
import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'

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

vi.mock('@/apps/user/shared/stores/translation.svelte', async () => {
  return import('#tests/frontend/translation_mock')
})

vi.mock(
  '@/apps/user/modules/tasks/components/detail/task_detail_metadata_sidebar.svelte',
  async () => {
    const stubModule = await import('../../../shared/test_stubs/empty_stub.svelte')
    return { default: stubModule.default }
  }
)

vi.mock('@/apps/user/modules/tasks/components/detail/task_execution_brief.svelte', async () => {
  const stubModule = await import('../../../shared/test_stubs/task_execution_brief_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/modules/tasks/components/detail/task_submission_panel.svelte', async () => {
  const stubModule = await import('../../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/modules/tasks/components/detail/task_files_tab.svelte', async () => {
  const stubModule = await import('../../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/modules/tasks/components/detail/task_discussion_tab.svelte', async () => {
  const stubModule = await import('../../../shared/test_stubs/task_discussion_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/shared/ui/dialog.svelte', async () => {
  const stubModule = await import('../../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/shared/ui/dialog_content.svelte', async () => {
  const stubModule = await import('../../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

describe('TaskDetailPanel', () => {
  it('opens the shared task editor inside the detail popup when permitted', async () => {
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

    await fireEvent.click(screen.getByRole('tab', { name: /edit|sửa/i }))
    expect(inertiaRouter.visit).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /save changes|lưu thay đổi/i })).toBeInTheDocument()
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
        shellMode: 'app',
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
        shellMode: 'app',
        metadata: { statuses: [], labels: [], priorities: [], users: [] },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Reload brief' }))
    expect(onReloadBrief).toHaveBeenCalledOnce()
    expect(inertiaRouter.reload).not.toHaveBeenCalled()
  })

  it('keeps the complete task work surface inside the board card room', async () => {
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
        canComment: true,
        canOpenWorkTabs: true,
        isAssignee: true,
      },
      childTasks: [],
    }

    render(TaskDetailPanel, {
      props: {
        open: true,
        onOpenChange: vi.fn(),
        task,
        shellMode: 'app',
        metadata: {
          statuses: [],
          labels: [],
          priorities: [],
          users: [],
        },
      },
    })

    expect(screen.queryByRole('button', { name: /Mở/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('task-drawer-work-surfaces')).not.toBeInTheDocument()
    expect(screen.queryByText(/Nộp bài/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Tệp/i)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Kỹ năng$/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Phân công$/i })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /^Kế hoạch$/i })).not.toBeInTheDocument()
    await fireEvent.click(screen.getByRole('tab', { name: /thảo luận/i }))
    const discussion = screen.getByTestId('task-discussion-stub')
    expect(discussion).toBeInTheDocument()
  })

  it('keeps discussion visible when the viewer lacks work-surface mutation access', async () => {
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
    await fireEvent.click(screen.getByRole('tab', { name: /thảo luận/i }))
    expect(screen.getByTestId('task-discussion-stub')).toBeInTheDocument()
  })

  it('shows discussion to a commenter without exposing work surfaces', async () => {
    const task: TaskDetail = {
      id: 'task-1',
      title: 'Task comment access',
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
      assigned_to: 'user-2',
      permissions: {
        canComment: true,
        canOpenWorkTabs: false,
      },
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
    await fireEvent.click(screen.getByRole('tab', { name: /thảo luận/i }))
    expect(screen.getByTestId('task-discussion-stub')).toBeInTheDocument()
  })
})
