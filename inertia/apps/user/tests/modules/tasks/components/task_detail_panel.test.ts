import { render, screen } from '@testing-library/svelte'
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

vi.mock('@inertiajs/svelte', () => ({
  page: inertiaPage,
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
  const stubModule = await import('../../../shared/test_stubs/empty_stub.svelte')
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
    expect(screen.getByTestId('task-drawer-work-surfaces')).toBeInTheDocument()
    expect(screen.getByText(/Nộp bài/i)).toBeInTheDocument()
    expect(screen.getByText(/Tệp/i)).toBeInTheDocument()
    expect(screen.getByTestId('task-discussion-stub')).toBeInTheDocument()
  })

  it('hides discussion and work surfaces when the viewer lacks work access', () => {
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
    expect(screen.queryByTestId('task-discussion-stub')).not.toBeInTheDocument()
  })
})
