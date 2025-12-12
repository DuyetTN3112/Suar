import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import ProjectOperatingModelTab from '@/apps/org/modules/projects/components/project_operating_model_tab.svelte'
import { buildRoleTaskLaunchHref } from '@/apps/org/modules/projects/lib/project_operating_model'

describe('project operating model content', () => {
  it('builds task launch href from project role and inferred task type', () => {
    expect(
      buildRoleTaskLaunchHref({
        baseUrl: '/org/tasks/board',
        projectId: 'project-1',
        roleId: 'role-1',
        roleCode: 'qa_engineer',
        workArea: 'qa',
      })
    ).toBe(
      '/org/tasks/board?project_id=project-1&roleId=role-1&create=1&taskType=qa_testing&workArea=qa'
    )
  })
})

describe('ProjectOperatingModelTab', () => {
  it('renders operating model sections and launch links', () => {
    render(ProjectOperatingModelTab, {
      props: {
        projectId: 'project-1',
        taskLaunchBaseUrl: '/org/tasks/board',
        roles: [
          {
            id: 'role-1',
            name: 'QA Engineer',
            code: 'qa_engineer',
            isActive: true,
            skills: [
              {
                id: 'skill-1',
                skill: { skillName: 'QA Strategy', categoryCode: 'engineering' },
                minimumLevel: { code: 'l3' },
                targetLevel: { code: 'l7' },
              },
            ],
          },
          { id: 'role-2', name: 'Frontend Engineer', code: 'frontend_engineer', isActive: true },
        ],
        canLaunchTask: true,
      },
    })

    expect(screen.getByRole('heading', { name: /Preset tạo task/i })).toBeInTheDocument()
    expect(screen.getByText(/Task Factory/i)).toBeInTheDocument()
    expect(screen.getByText(/QA Strategy/i)).toBeInTheDocument()
    expect(screen.getByText(/L3-L7/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Review owner \+ 2 peer/i)[0]).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Tạo task/i })[0]).toHaveAttribute(
      'href',
      '/org/tasks/board?project_id=project-1&roleId=role-1&create=1&taskType=qa_testing'
    )
  })

  it('announces when no role is ready for task launch', () => {
    render(ProjectOperatingModelTab, {
      props: {
        projectId: 'project-1',
        taskLaunchBaseUrl: '/org/tasks/board',
        roles: [],
        canLaunchTask: true,
      },
    })

    expect(screen.getByText(/Chưa có role active/i)).toBeInTheDocument()
  })
})
