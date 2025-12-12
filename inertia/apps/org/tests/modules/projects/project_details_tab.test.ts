import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import ProjectDetailsTab from '@/apps/org/modules/projects/components/project_details_tab.svelte'

describe('ProjectDetailsTab', () => {
  it('keeps the overview focused on project profile fields only', () => {
    render(ProjectDetailsTab, {
      props: {
        projectState: {
          id: 'project-1',
          name: 'Apollo',
          organization_id: 'org-1',
          creator_id: 'creator-1',
          created_at: '2026-07-01T00:00:00.000Z',
          updated_at: '2026-07-02T00:00:00.000Z',
          description: 'Project profile description',
          status: 'in_progress',
          organization_name: 'Suar',
          creator_name: 'Owner',
          manager_name: 'Manager',
          start_date: '2026-07-03T00:00:00.000Z',
          end_date: '2026-07-30T00:00:00.000Z',
          visibility: 'team',
        },
        editing: false,
        editForm: {
          name: 'Apollo',
          description: 'Project profile description',
          status: 'in_progress',
        },
        formatDate: (value: string) => value.slice(0, 10),
      },
    })

    expect(screen.getByRole('heading', { name: 'Thông tin dự án' })).toBeInTheDocument()
    expect(screen.getByText('Project profile description')).toBeInTheDocument()
    expect(screen.getByText('2026-07-03')).toBeInTheDocument()

    expect(screen.queryByText('Thành viên')).not.toBeInTheDocument()
    expect(screen.queryByText('Task đang chạy')).not.toBeInTheDocument()
    expect(screen.queryByText('Task trễ')).not.toBeInTheDocument()
    expect(screen.queryByText('Delivery coverage')).not.toBeInTheDocument()
    expect(screen.queryByText('Role coverage')).not.toBeInTheDocument()
    expect(screen.queryByText('Need staffing')).not.toBeInTheDocument()
    expect(screen.queryByText('Coverage by role')).not.toBeInTheDocument()
    expect(screen.queryByText('Staffing status')).not.toBeInTheDocument()
  })
})
