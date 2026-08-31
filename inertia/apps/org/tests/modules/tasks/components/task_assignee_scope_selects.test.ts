import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import TaskAssigneeScopeSelects from '@/apps/org/modules/tasks/components/shared/task_assignee_scope_selects.svelte'

function buildProps(
  visibility: 'project' | 'internal' | 'external' | 'all' = 'internal'
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
  it('limits project-only tasks to project members', () => {
    render(TaskAssigneeScopeSelects, { props: buildProps('project') })

    expect(screen.getByText('LinhPM')).toBeInTheDocument()
    expect(screen.queryByText('HaQA')).not.toBeInTheDocument()
    expect(screen.queryByText('MaiExternalContributor')).not.toBeInTheDocument()
  })
  it('shows one assignee selector and keeps internal visibility scoped', () => {
    render(TaskAssigneeScopeSelects, { props: buildProps('internal') })

    expect(screen.getByLabelText('Người thực hiện (chọn 1 người)')).toBeInTheDocument()
    expect(screen.getByText('LinhPM')).toBeInTheDocument()
    expect(screen.getByText('HaQA')).toBeInTheDocument()
    expect(screen.queryByText('MaiExternalContributor')).not.toBeInTheDocument()
  })

  it('shows eligible people in the same selector for marketplace-facing tasks', () => {
    render(TaskAssigneeScopeSelects, { props: buildProps('external') })

    expect(screen.getByText('LinhPM')).toBeInTheDocument()
    expect(screen.getByText('HaQA')).toBeInTheDocument()
    expect(screen.getByText('MaiExternalContributor')).toBeInTheDocument()
    expect(screen.getByTestId('task-assignee-scope-summary')).toHaveTextContent('3 người có thể chọn')
  })

  it('makes a visibility change visible before the assignee dropdown is opened', async () => {
    const view = render(TaskAssigneeScopeSelects, { props: buildProps('internal') })

    expect(screen.getByTestId('task-assignee-scope-summary')).toHaveTextContent('2 người có thể chọn')
    expect(screen.getByTestId('task-assignee-scope-summary')).not.toHaveTextContent('contributor marketplace')

    await view.rerender(buildProps('external'))

    expect(screen.getByTestId('task-assignee-scope-summary')).toHaveTextContent('3 người có thể chọn')
    expect(screen.getByTestId('task-assignee-scope-summary')).not.toHaveTextContent('contributor marketplace')
  })

  it('truncates long selected names in the single selector', () => {
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
