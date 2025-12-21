import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import TaskAssigneeScopeSelects from '@/apps/user/modules/tasks/components/shared/task_assignee_scope_selects.svelte'

function buildProps(
  visibility: 'internal' | 'external' | 'all' = 'internal'
) {
  return {
    visibility,
    assignedTo: '',
    assigneeGroups: {
      projectMembers: [
        { id: 'project-1', username: 'LinhPM', email: 'linh@example.com' },
      ],
      orgMembersOutsideProject: [
        { id: 'org-1', username: 'HaQA', email: 'ha@example.com' },
      ],
    },
    fallbackUsers: [
      { id: 'external-1', username: 'MaiExternalContributor', email: 'mai@example.com' },
    ],
    onSelect: () => {},
  }
}

describe('TaskAssigneeScopeSelects', () => {
  it('hides external assignee bucket for internal tasks', () => {
    render(TaskAssigneeScopeSelects, { props: buildProps('internal') })

    expect(screen.getByText('Trong project (1)')).toBeInTheDocument()
    expect(screen.getByText('Trong tổ chức, ngoài project (1)')).toBeInTheDocument()
    expect(screen.queryByText('Contributor bên ngoài (1)')).not.toBeInTheDocument()
  })

  it('shows all three assignee buckets for marketplace-facing tasks', () => {
    render(TaskAssigneeScopeSelects, { props: buildProps('external') })

    expect(screen.getByText('Trong project (1)')).toBeInTheDocument()
    expect(screen.getByText('Trong tổ chức, ngoài project (1)')).toBeInTheDocument()
    expect(screen.getByText('Contributor bên ngoài (1)')).toBeInTheDocument()
  })

  it('stacks buckets and truncates long selected names inside narrow task forms', () => {
    const { container } = render(TaskAssigneeScopeSelects, {
      props: {
        ...buildProps('external'),
        assignedTo: 'external-1',
      },
    })

    const bucketGrid = container.querySelector('.grid.gap-3')
    expect(bucketGrid).not.toHaveClass('sm:grid-cols-2')
    expect(bucketGrid).not.toHaveClass('xl:grid-cols-3')
    const selectedLabels = screen.getAllByText('MaiExternalContributor')
    expect(selectedLabels.some((label) => label.classList.contains('truncate'))).toBe(true)
  })
})
