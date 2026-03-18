import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import SprintManagementPage from '@/apps/org/modules/sprints/index.svelte'

vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', () =>
  import('../../shared/test_stubs/layout_stub.svelte')
)

vi.mock('@/apps/org/modules/projects/components/project_sprint_panel.svelte', () =>
  import('../../shared/test_stubs/project_sprint_panel_stub.svelte')
)

vi.mock('@inertiajs/svelte', () => ({
  page: {
    url: '/org/sprints?projectId=project-2',
  },
}))

describe('Org SprintManagementPage', () => {
  const projects = [
    {
      id: 'project-1',
      name: 'Apollo',
      description: 'First delivery track',
      status: 'active',
      created_at: '2026-07-01T00:00:00.000Z',
      _count: {
        members: 3,
        tasks: 8,
      },
    },
    {
      id: 'project-2',
      name: 'Zeus',
      description: 'Selected delivery track',
      status: 'pending',
      created_at: '2026-07-02T00:00:00.000Z',
      _count: {
        members: 2,
        tasks: 5,
      },
    },
  ]

  it('renders sprint coordination as a project picker without embedding project controls', () => {
    render(SprintManagementPage, {
      props: {
        projects,
        selectedProjectId: 'project-2',
        pagination: {
          mode: 'offset',
          total: 2,
          perPage: 20,
          page: 1,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        filters: {},
      },
    })

    expect(screen.getByRole('heading', { name: 'Điều phối sprint' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Apollo/i })).toHaveAttribute(
      'href',
      '/org/projects/project-1?focus=sprints'
    )
    expect(screen.getByRole('heading', { name: 'Zeus' })).toBeInTheDocument()
    expect(screen.queryByTestId('project-sprint-controls')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Mở sprint của dự án/i })).toHaveAttribute(
      'href',
      '/org/projects/project-2?focus=sprints'
    )
    expect(screen.queryByText('Org sprint workspace')).not.toBeInTheDocument()
    expect(screen.queryByText(/Sprint actions chạy/)).not.toBeInTheDocument()
    expect(screen.queryByText(/workspace riêng/)).not.toBeInTheDocument()
  })

  it('shows an empty state when organization has no projects to scope sprint planning', () => {
    render(SprintManagementPage, {
      props: {
        projects: [],
        selectedProjectId: null,
        pagination: {
          mode: 'offset',
          total: 0,
          perPage: 20,
          page: 1,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        filters: {},
      },
    })

    expect(screen.getByText('Chưa có dự án để quản lý sprint.')).toBeInTheDocument()
    expect(screen.queryByTestId('project-sprint-controls')).not.toBeInTheDocument()
  })
})
