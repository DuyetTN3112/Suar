/* eslint-disable import-x/order */
import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import LayoutStub from '../../../shared/test_stubs/layout_stub.svelte'
import EmptyStub from '../../../shared/test_stubs/empty_stub.svelte'
import TaskDiscussionStub from '../../../shared/test_stubs/task_discussion_stub.svelte'

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

vi.mock('@/apps/org/shared/stores/translation.svelte', () => ({
  useTranslation: () => ({
    t: (_key: string, _params?: Record<string, unknown>, fallback?: string) => fallback ?? '',
  }),
}))

vi.mock('@/apps/org/modules/tasks/components/detail/task_detail_metadata_sidebar.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/org/modules/tasks/components/detail/task_execution_brief.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/org/modules/tasks/components/detail/task_discussion_tab.svelte', () => ({
  default: TaskDiscussionStub,
}))

vi.mock('@/apps/org/shared/ui/dialog.svelte', () => ({
  default: LayoutStub,
}))

vi.mock('@/apps/org/shared/ui/dialog_content.svelte', () => ({
  default: LayoutStub,
}))

import TaskDetailPanel from '@/apps/org/modules/tasks/components/detail/task_detail_panel.svelte'
import type { TaskDetail } from '@/apps/org/modules/tasks/types/index.svelte'

describe('TaskDetailPanel', () => {
  it('shows discussion surface inside detail modal', () => {
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

    expect(screen.getByText('Mô tả')).toBeInTheDocument()
    const contextHeading = screen.getByText(/Bối cảnh & Nghiệm thu chi tiết/i)
    const discussion = screen.getByTestId('task-discussion-stub')

    expect(discussion).toHaveTextContent(
      'Discussion stub for task-1 / user-1'
    )
    expect(contextHeading.compareDocumentPosition(discussion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
