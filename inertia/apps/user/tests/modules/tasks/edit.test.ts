import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import OrgTaskEditPage from '@/apps/org/modules/tasks/edit.svelte'
import UserTaskEditPage from '@/apps/user/modules/tasks/edit.svelte'

const { routerDelete, routerPut, routerVisit } = vi.hoisted(() => ({
  routerDelete: vi.fn(),
  routerPut: vi.fn(),
  routerVisit: vi.fn(),
}))

vi.mock('@inertiajs/svelte', () => ({
  router: {
    visit: routerVisit,
    put: routerPut,
    delete: routerDelete,
  },
}))

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/modules/tasks/components/forms/task_assignment_fields.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/org/modules/tasks/components/forms/task_assignment_fields.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock(
  '@/apps/user/modules/tasks/components/forms/task_priority_label_fields.svelte',
  async () => {
    const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
    return { default: stubModule.default }
  }
)

vi.mock('@/apps/org/modules/tasks/components/forms/task_priority_label_fields.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock(
  '@/apps/user/modules/tasks/components/shared/task_verification_methods_field.svelte',
  async () => {
    const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
    return { default: stubModule.default }
  }
)

vi.mock(
  '@/apps/org/modules/tasks/components/shared/task_verification_methods_field.svelte',
  async () => {
    const stubModule = await import('../../shared/test_stubs/empty_stub.svelte')
    return { default: stubModule.default }
  }
)

vi.mock('@/apps/user/shared/stores/translation.svelte', async () => {
  return import('#tests/frontend/translation_mock')
})

vi.mock('@/apps/org/shared/stores/translation.svelte', async () => {
  return import('#tests/frontend/translation_mock')
})

const baseTask = {
  id: 'task-1',
  title: 'Marketplace visibility',
  description: 'desc',
  status: 'todo',
  task_status_id: 'todo',
  priority: 'medium' as const,
  label: 'feature' as const,
  project_id: 'project-1',
  assigned_to: null,
  task_visibility: 'internal' as const,
  due_date: null,
  parent_task_id: null,
  task_type: 'feature_development',
  verification_method: '',
  acceptance_criteria: 'criteria',
  context_background: '',
  tech_stack: [],
  learning_objectives: [],
  domain_tags: [],
  environment: '',
  collaboration_type: '',
  complexity_notes: '',
  role_in_task: '',
  autonomy_level: '',
  problem_category: '',
  business_domain: '',
  estimated_users_affected: null,
  created_at: '2026-07-27T00:00:00.000Z',
  updated_at: '2026-07-27T00:00:00.000Z',
  organization_id: 'org-1',
  creator_id: 'user-1',
}

function buildProps(shellMode: 'app' | 'organization') {
  return {
    shellMode,
    task: baseTask,
    metadata: {
      statuses: [{ value: 'todo', label: 'To do' }],
      labels: [],
      priorities: [{ value: 'medium', label: 'Medium' }],
      users: [],
      parentTasks: [],
      projects: [{ id: 'project-1', name: 'Project One' }],
    },
    permissions: {
      canEdit: true,
      canDelete: true,
      canAssign: true,
      canChangeStatus: true,
    },
  }
}

describe('TaskEditPage', () => {
  it('only exposes draft deletion for a persisted task draft', () => {
    render(UserTaskEditPage, {
      props: {
        ...buildProps('app'),
        task: { ...baseTask, resolved_brief: { state: 'draft' } },
      },
    })

    expect(screen.getByRole('button', { name: /xóa nháp|discard draft/i })).toBeInTheDocument()
  })

  it('renders editable task visibility in the user shell', async () => {
    render(UserTaskEditPage, {
      props: buildProps('app'),
    })

    const internal = screen.getByRole('radio', { name: /toàn tổ chức|entire organization/i })
    expect(internal).toBeChecked()

    const external = screen.getByRole('radio', { name: /mở thêm|marketplace/i })
    await fireEvent.click(external)

    expect(external).toBeChecked()
  })

  it('preserves the existing evidence-governed profile contract in the user edit form', async () => {
    render(UserTaskEditPage, {
      props: {
        ...buildProps('app'),
        task: {
          ...baseTask,
          resolved_brief: {
            state: 'published',
            resolvedContract: {
              evidence: {
                mode: 'evidence_enabled',
                profileEligibility: true,
                requirements: [],
                capabilities: [],
              },
            },
          },
        },
      },
    })

    await fireEvent.click(screen.getByRole('tab', { name: /Yêu cầu & nghiệm thu/i }))

    expect(screen.getByRole('radio', { name: /Có bằng chứng/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Đủ điều kiện đưa vào hồ sơ/i })).toBeChecked()
  })

  it('renders an editable visibility select in the org shell', async () => {
    render(OrgTaskEditPage, {
      props: buildProps('organization'),
    })

    const select = screen.getByRole('combobox', { name: /quyền truy cập task|task access/i })
    expect((select as HTMLSelectElement).value).toBe('internal')

    await fireEvent.change(select, { target: { value: 'all' } })

    expect(screen.getByRole('combobox', { name: /quyền truy cập task|task access/i })).toHaveValue(
      'all'
    )
  })

  it.each([
    ['user', UserTaskEditPage, 'app'],
    ['org', OrgTaskEditPage, 'organization'],
  ] as const)(
    'persists typed title and description in the %s edit page',
    async (_shell, Page, shellMode) => {
      routerPut.mockClear()

      render(Page, {
        props: {
          ...buildProps(shellMode),
          ...(_shell === 'user'
            ? { task: { ...baseTask, resolved_brief: { state: 'draft' } } }
            : {}),
        },
      })

      await fireEvent.input(screen.getByLabelText(/Tiêu đề|Title/i), {
        target: { value: 'Updated title. with spaces' },
      })
      await fireEvent.input(screen.getByLabelText(/Mô tả|Description/i), {
        target: { value: 'Context description. with spaces' },
      })
      await fireEvent.click(
        screen.getByRole('button', {
          name: _shell === 'user' ? /lưu nháp|save draft/i : /lưu|save changes/i,
        })
      )

      expect(routerPut).toHaveBeenCalledTimes(1)
      expect(routerPut.mock.calls[0]?.[1]).toMatchObject({
        title: 'Updated title. with spaces',
        description: 'Context description. with spaces',
      })
    }
  )
})
