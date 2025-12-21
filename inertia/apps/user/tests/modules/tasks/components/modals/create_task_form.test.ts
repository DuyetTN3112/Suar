import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import CreateTaskForm from '@/apps/user/modules/tasks/components/modals/create_task_form.svelte'
import type { TaskCreateFormData } from '@/apps/user/modules/tasks/types/create_form_types'

function buildProps() {
  return {
    formData: {
      title: '',
      description: '',
      task_status_id: 'todo',
      task_type: 'feature_development',
      verification_method: 'code_review\ncustom:Pair walkthrough with PM',
      project_id: 'project-1',
      priority: 'high',
      label: 'backend',
      task_visibility: 'internal',
      assigned_to: '',
      due_date: '',
      parent_task_id: '',
      estimated_time: '0',
      required_skills: [],
      acceptance_criteria: '',
      context_background: '',
      role_in_task: '',
      business_domain: '',
      problem_category: '',
      tech_stack_text: '',
      learning_objectives_text: '',
      domain_tags_text: '',
    } satisfies TaskCreateFormData,
    setFormData: () => {},
    errors: {},
    statuses: [{ value: 'todo', label: 'To do' }],
    priorities: [{ value: 'high', label: 'High' }],
    labels: [{ value: 'backend', label: 'Backend' }],
    users: [{ id: 'user-1', username: 'alex', email: 'alex@example.com' }],
    assigneeGroups: {
      projectMembers: [],
      orgMembersOutsideProject: [],
    },
    parentTasks: [],
    availableSkills: [
      { id: 'skill-1', name: 'TypeScript', categoryCode: 'technology' },
      { id: 'skill-2', name: 'Stakeholder Communication', categoryCode: 'soft_skill' },
      { id: 'skill-3', name: 'On-time Delivery', categoryCode: 'delivery' },
    ],
    projects: [{ id: 'project-1', name: 'Project One' }],
    proficiencyLevels: [{ value: 'l7', label: 'L7 · Middle Solid' }],
    formError: '',
  }
}

describe('CreateTaskForm', () => {
  it('splits task setup, skills, and contract into tabs', async () => {
    render(CreateTaskForm, { props: buildProps() })

    expect(screen.getByRole('tab', { name: 'Cơ bản' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText(/Tiêu đề/i)).toBeInTheDocument()
    expect(screen.getByText(/Ngày đến hạn/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Chỉ trong tổ chức/i).length).toBeGreaterThan(0)
    expect(screen.getByText('Chọn nghiệp vụ')).toBeInTheDocument()
    expect(screen.getByText('Chọn loại vấn đề')).toBeInTheDocument()
    expect(screen.getByText('Chọn vai trò')).toBeInTheDocument()
    expect(screen.queryByText('Cách nghiệm thu')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^Project/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Kĩ năng bắt buộc/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Tiêu chí nghiệm thu/i)).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('tab', { name: 'Skills' }))

    expect(screen.getByRole('tab', { name: 'Skills' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByText('Công nghệ').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Kỹ thuật phần mềm').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Kỹ năng mềm').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Thực thi').length).toBeGreaterThan(0)
    expect(screen.queryByLabelText(/Tiêu đề/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Tiêu chí nghiệm thu/i)).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('tab', { name: 'Nghiệm thu' }))

    expect(screen.getByRole('tab', { name: 'Nghiệm thu' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Cách nghiệm thu')).toBeInTheDocument()
    expect(screen.getByText('Cách nghiệm thu khác')).toBeInTheDocument()
    expect(screen.getByLabelText(/Tiêu chí nghiệm thu/i)).toBeInTheDocument()
    expect(screen.queryByText(/Mẫu theo mảng việc/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Ngày đến hạn/i)).not.toBeInTheDocument()
  })
})
