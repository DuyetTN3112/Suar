import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import TaskShowPage from '@/apps/user/modules/tasks/show.svelte'

const inertiaMocks = vi.hoisted(() => ({
  page: {
    props: {
      auth: {
        user: {
          id: 'user-1',
          current_organization_role: null as string | null,
        },
      },
    },
  },
  router: {
    visit: vi.fn(),
    delete: vi.fn(),
    reload: vi.fn(),
  },
}))

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}))

vi.mock('svelte-sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock('@inertiajs/svelte', () => ({
  page: inertiaMocks.page,
  router: inertiaMocks.router,
}))

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/app_layout_marker_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/shared/stores/translation.svelte', async () => {
  return import('#tests/frontend/translation_mock')
})

vi.mock('@/apps/user/modules/tasks/components/detail/task_delete_dialog.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})
vi.mock('@/apps/user/modules/tasks/components/detail/task_details_sidebar.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})
vi.mock('@/apps/user/modules/tasks/components/detail/task_submission_panel.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})
vi.mock('@/apps/user/modules/tasks/components/detail/task_review_zone_card.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/task_review_zone_stub.svelte')
  return { default: stubModule.default }
})
vi.mock('@/apps/user/modules/tasks/components/skill_requirements_tab.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})
vi.mock('@/apps/user/modules/tasks/components/detail/task_context_card.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})
vi.mock('@/apps/user/modules/tasks/components/detail/task_discussion_tab.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})
vi.mock('@/apps/user/modules/tasks/components/detail/task_files_tab.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})
vi.mock('@/apps/user/modules/tasks/components/detail/task_history_tab.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

const mockedAxios = vi.mocked(axios)

describe('TaskShowPage apply action', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('submits marketplace proposals to the canonical JSON API route', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        data: {
          id: 'application-1',
        },
      },
    })

    render(TaskShowPage, {
      props: {
        task: {
          id: 'task-1',
          title: 'Marketplace task detail',
          description: 'Public task detail',
          status: 'todo',
          priority: 'medium',
          label: 'feature',
          creator_id: 'user-1',
          due_date: null,
          created_at: '2026-07-14T00:00:00.000Z',
          updated_at: '2026-07-14T00:00:00.000Z',
          organization_id: 'org-1',
          project_id: 'project-1',
          task_visibility: 'external',
          requiredSkills: [],
          childTasks: [],
        },
        permissions: {
          canEdit: false,
          canDelete: false,
          canAssign: false,
          canChangeStatus: false,
          canApply: true,
        },
        auditLogs: [],
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Gửi đề xuất' }))

    await waitFor(() => {
      expect(mockedAxios.post.mock.calls).toContainEqual([
        '/api/v1/tasks/task-1/apply',
        {
          application_source: 'public_listing',
        },
        {
          headers: {
            Accept: 'application/json',
          },
        },
      ])
    })
    expect(inertiaMocks.router.reload).toHaveBeenCalledWith({
      only: ['task', 'permissions', 'auditLogs', 'taskReviewDetail', 'flash'],
    })
  })

  it('keeps public marketplace viewers out of task work tabs', () => {
    render(TaskShowPage, {
      props: {
        task: {
          id: 'task-1',
          title: 'Marketplace task detail',
          description: 'Public task detail',
          status: 'todo',
          priority: 'medium',
          label: 'feature',
          creator_id: 'owner-1',
          assigned_to: null,
          due_date: null,
          created_at: '2026-07-14T00:00:00.000Z',
          updated_at: '2026-07-14T00:00:00.000Z',
          organization_id: 'org-1',
          project_id: 'project-1',
          task_visibility: 'external',
          requiredSkills: [],
          childTasks: [],
        },
        permissions: {
          isCreator: false,
          isAssignee: false,
          canEdit: false,
          canDelete: false,
          canAssign: false,
          canChangeStatus: false,
          canApply: true,
        },
        auditLogs: [],
      },
    })

    expect(screen.getByText('Tổng quan')).toBeInTheDocument()
    expect(screen.getByText('Kỹ năng')).toBeInTheDocument()
    expect(screen.queryByText('Nộp bài')).not.toBeInTheDocument()
    expect(screen.queryByText('Thảo luận')).not.toBeInTheDocument()
    expect(screen.queryByText('Tệp')).not.toBeInTheDocument()
    expect(screen.getByText('Chưa có sprint')).toBeInTheDocument()
  })

  it('shows a sprint link on task detail when the task belongs to a sprint', () => {
    render(TaskShowPage, {
      props: {
        task: {
          id: 'task-1',
          title: 'Sprint-backed task detail',
          description: 'Tracked in a project sprint',
          status: 'todo',
          priority: 'medium',
          label: 'feature',
          creator_id: 'owner-1',
          assigned_to: 'user-1',
          due_date: null,
          created_at: '2026-07-14T00:00:00.000Z',
          updated_at: '2026-07-14T00:00:00.000Z',
          organization_id: 'org-1',
          project_id: 'project-1',
          projectSprintId: 'sprint-1',
          projectSprintName: 'Sprint 4',
          task_visibility: 'internal',
          requiredSkills: [],
          childTasks: [],
        },
        permissions: {
          isCreator: false,
          isAssignee: true,
          canEdit: false,
          canDelete: false,
          canAssign: false,
          canChangeStatus: false,
          canApply: false,
        },
        auditLogs: [],
      },
    })

    const sprintLink = screen.getByRole('link', { name: 'Sprint 4' })
    expect(sprintLink).toBeInTheDocument()
    expect(sprintLink).toHaveAttribute('href', '/projects/project-1?tab=sprints')
  })

  it('uses organization shell when task detail is opened from organization route', () => {
    render(TaskShowPage, {
      props: {
        shellMode: 'organization',
        task: {
          id: 'task-1',
          title: 'Organization task detail',
          description: 'Managed task detail',
          status: 'todo',
          priority: 'medium',
          label: 'feature',
          creator_id: 'owner-1',
          assigned_to: null,
          due_date: null,
          created_at: '2026-07-14T00:00:00.000Z',
          updated_at: '2026-07-14T00:00:00.000Z',
          organization_id: 'org-1',
          project_id: 'project-1',
          task_visibility: 'external',
          requiredSkills: [],
          childTasks: [],
        },
        permissions: {
          isCreator: false,
          isAssignee: false,
          canEdit: true,
          canDelete: false,
          canAssign: true,
          canChangeStatus: true,
          canApply: false,
        },
        auditLogs: [],
      },
    })

    expect(screen.getByTestId('app-layout-marker')).toBeInTheDocument()
  })

  it('shows proposal review CTA from review permission without edit permission', () => {
    render(TaskShowPage, {
      props: {
        task: {
          id: 'task-1',
          title: 'Reviewable marketplace task',
          description: 'Managed proposal flow',
          status: 'todo',
          priority: 'medium',
          label: 'feature',
          creator_id: 'owner-1',
          assigned_to: null,
          due_date: null,
          created_at: '2026-07-14T00:00:00.000Z',
          updated_at: '2026-07-14T00:00:00.000Z',
          organization_id: 'org-1',
          project_id: 'project-1',
          task_visibility: 'external',
          requiredSkills: [],
          childTasks: [],
        },
        permissions: {
          isCreator: false,
          isAssignee: false,
          canEdit: false,
          canDelete: false,
          canAssign: false,
          canChangeStatus: false,
          canApply: false,
          canReviewApplications: true,
        },
        auditLogs: [],
      },
    })

    expect(screen.getByRole('button', { name: /xem đề xuất/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Sửa$/i })).not.toBeInTheDocument()
  })

  it('uses review mode on task detail when task review workflow data is present', () => {
    render(TaskShowPage, {
      props: {
        task: {
          id: 'task-1',
          title: 'Done task waiting review',
          description: 'Needs review workflow controls',
          status: 'done',
          priority: 'medium',
          label: 'feature',
          creator_id: 'owner-1',
          assigned_to: 'worker-1',
          due_date: null,
          created_at: '2026-07-14T00:00:00.000Z',
          updated_at: '2026-07-14T00:00:00.000Z',
          organization_id: 'org-1',
          project_id: 'project-1',
          task_visibility: 'internal',
          requiredSkills: [],
          childTasks: [],
        },
        permissions: {
          isCreator: true,
          isAssignee: false,
          canEdit: true,
          canDelete: true,
          canAssign: true,
          canChangeStatus: true,
          canApply: false,
          canReviewApplications: true,
        },
        auditLogs: [],
        taskReviewDetail: {
          task: {
            assigned_to: 'worker-1',
            creator_id: 'user-1',
          },
          workflow: null,
          reviewers: [],
          comments: [],
          reviewMessages: [],
        },
      },
    })

    expect(screen.getByLabelText('Nhập review')).toBeInTheDocument()
    expect(screen.queryByTestId('task-review-zone-stub')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Sửa$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Xóa$/i })).not.toBeInTheDocument()
  })
})
