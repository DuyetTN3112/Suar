import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import WorkIndexPage from '@/apps/user/modules/work/index.svelte'

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

describe('WorkIndexPage', () => {
  it('keeps assigned external work links inside the /work surface', () => {
    render(WorkIndexPage, {
      props: {
        tasks: {
          data: [
            {
              id: 'task-1',
              title: 'Marketplace implementation',
              status: 'in_progress',
              label: 'feature',
              priority: 'high',
              creator_id: 'creator-1',
              due_date: '2026-08-01',
              created_at: '2026-07-01T00:00:00.000Z',
              updated_at: '2026-07-02T00:00:00.000Z',
              organization_id: 'org-1',
              project_id: 'project-1',
              organization: { id: 'org-1', name: 'Suar Labs' },
              project: { id: 'project-1', name: 'Marketplace' },
            },
          ],
          meta: {
            total: 1,
            per_page: 10,
            current_page: 1,
            last_page: 1,
          },
        },
        filters: {
          limit: 10,
        },
      },
    })

    expect(screen.getByRole('link', { name: 'Marketplace implementation' })).toHaveAttribute(
      'href',
      '/projects/project-1/tasks?task_id=task-1'
    )
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      '/projects/project-1/tasks?task_id=task-1'
    )
    expect(screen.getByRole('link', { name: 'Submit work' })).toHaveAttribute(
      'href',
      '/projects/project-1/tasks?task_id=task-1'
    )
  })

  it('shows an empty state for users without active assigned work', () => {
    render(WorkIndexPage, {
      props: {
        tasks: {
          data: [],
          meta: {
            total: 0,
            per_page: 10,
            current_page: 1,
            last_page: 1,
          },
        },
      },
    })

    expect(screen.getByRole('heading', { name: 'No active work' })).toBeInTheDocument()
  })

  it('renders organization and project context for assigned work without an organization gate', () => {
    render(WorkIndexPage, {
      props: {
        tasks: {
          data: [
            {
              id: 'task-2',
              title: 'External contributor task',
              status: 'in_progress',
              label: 'feature',
              priority: 'medium',
              creator_id: 'creator-1',
              due_date: null,
              created_at: '2026-07-01T00:00:00.000Z',
              updated_at: '2026-07-02T00:00:00.000Z',
              organization_id: 'external-org',
              project_id: 'project-2',
              organization: undefined,
              project: { id: 'project-2', name: 'Open marketplace project' },
            },
          ],
          meta: {
            total: 1,
            per_page: 10,
            current_page: 1,
            last_page: 1,
          },
        },
      },
    })

    expect(screen.getByText(/External organization/)).toHaveTextContent(
      'External organization · Open marketplace project'
    )
    expect(screen.queryByText(/select organization/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/join organization/i)).not.toBeInTheDocument()
  })
})
