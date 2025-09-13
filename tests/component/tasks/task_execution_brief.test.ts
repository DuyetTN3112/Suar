import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import TaskExecutionBrief from '@/pages/tasks/components/detail/task_execution_brief.svelte'

describe('TaskExecutionBrief', () => {
  it('renders rich execution context for task handoff', () => {
    render(TaskExecutionBrief, {
      props: {
        task: {
          impact_scope: 'project',
          expected_deliverables: [
            'Curriculum proposal document',
            'Competency rubrics guide',
          ],
          measurable_outcomes: [
            {
              metric: 'curriculum_coverage',
              target: '95%',
            },
          ],
          external_applications_count: 3,
          project: {
            id: 'project-1',
            name: 'Curriculum Ops',
          },
          parentTask: {
            id: 'task-parent',
            title: 'Design learning roadmap',
            status: 'in_progress',
          },
        },
      },
    })

    expect(screen.getByText('Phạm vi ảnh hưởng')).toBeInTheDocument()
    expect(screen.getByText('Curriculum proposal document')).toBeInTheDocument()
    expect(screen.getByText('Competency rubrics guide')).toBeInTheDocument()
    expect(screen.getByText('Curriculum coverage: 95%')).toBeInTheDocument()
    expect(screen.getByText('Curriculum Ops')).toBeInTheDocument()
    expect(screen.getByText('Design learning roadmap')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
