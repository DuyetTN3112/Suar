import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import OrgTaskEditPage from '@/apps/org/modules/tasks/edit.svelte'
import UserTaskEditPage from '@/apps/user/modules/tasks/edit.svelte'

vi.mock('@inertiajs/svelte', () => ({
  router: {
    visit: vi.fn(),
    put: vi.fn(),
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
  it('renders an editable visibility select in the user shell', async () => {
    render(UserTaskEditPage, {
      props: buildProps('app'),
    })

    const select = screen.getByRole('combobox', { name: /quyền truy cập task|task access/i })
    expect((select as HTMLSelectElement).value).toBe('internal')

    await fireEvent.change(select, { target: { value: 'external' } })

    expect(screen.getByRole('combobox', { name: /quyền truy cập task|task access/i })).toHaveValue(
      'external'
    )
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
})
