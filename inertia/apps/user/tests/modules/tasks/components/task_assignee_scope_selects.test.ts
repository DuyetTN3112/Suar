import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import TaskAssigneeScopeSelects from '@/apps/user/modules/tasks/components/shared/task_assignee_scope_selects.svelte'

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

  it('reuses the same scope selector for an optional reviewer', () => {
    render(TaskAssigneeScopeSelects, {
      props: {
        ...buildProps('internal'),
        fieldId: 'reviewer_user_id',
        fieldLabel: 'Người nghiệm thu (chọn 1 người)',
        fieldPlaceholder: 'Chọn một người nghiệm thu',
      },
    })

    expect(screen.getByLabelText('Người nghiệm thu (chọn 1 người)')).not.toBeRequired()
    expect(screen.getByText('LinhPM')).toBeInTheDocument()
    expect(screen.getByText('HaQA')).toBeInTheDocument()
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
        ...buildProps('external'),
        assignedTo: 'external-1',
      },
    })

    expect(container.firstElementChild?.className).toBe('grid gap-3')
    const selectedLabels = screen.getAllByText('MaiExternalContributor')
    expect(selectedLabels.some((label) => label.classList.contains('truncate'))).toBe(true)
  })
})
