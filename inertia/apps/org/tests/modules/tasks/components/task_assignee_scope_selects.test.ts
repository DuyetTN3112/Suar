import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import TaskAssigneeScopeSelects from '@/apps/org/modules/tasks/components/shared/task_assignee_scope_selects.svelte'

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

  it('uses stacked bucket layout and truncates long selected names', () => {
    const { container } = render(TaskAssigneeScopeSelects, {
      props: {
        ...buildProps('internal'),
        assignedTo: 'project-1',
        assigneeGroups: {
          ...buildProps('internal').assigneeGroups,
          projectMembers: [
            {
              id: 'project-1',
              username: 'seed_member_1784099046359_very_long_demo_username',
              email: 'member@example.com',
            },
          ],
        },
      },
    })

    const selectedName = screen.getAllByText(
      'seed_member_1784099046359_very_long_demo_username'
    )[0]
    expect(selectedName).toHaveClass('truncate')
    expect(container.firstElementChild?.className).toBe('grid gap-3')
  })
})
