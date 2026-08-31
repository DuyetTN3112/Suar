import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import CreateTaskForm from '@/apps/org/modules/tasks/components/modals/create_task_form.svelte'
import type { TaskCreateFormData } from '@/apps/org/modules/tasks/types/create_form_types'

function buildProps() {
  return {
    formData: {
      title: '', description: '', task_status_id: 'todo', task_type: 'feature_development',
      verification_method: 'code_review', project_id: 'project-1', priority: 'high', label: 'backend',
      task_visibility: 'internal', assigned_to: '', reviewer_user_id: '', due_date: '',
      parent_task_id: '', estimated_time: '0', required_skills: [], acceptance_criteria: '',
      context_background: '', role_in_task: '', business_domain: '', problem_category: '',
      tech_stack_text: '', learning_objectives_text: '', domain_tags_text: '',
    } satisfies TaskCreateFormData,
    setFormData: () => {}, errors: {},
    statuses: [{ value: 'todo', label: 'To do', slug: 'todo' }],
    priorities: [{ value: 'high', label: 'High' }], labels: [{ value: 'backend', label: 'Backend' }],
    users: [{ id: 'user-1', username: 'alex', email: 'alex@example.com' }],
    assigneeGroups: { projectMembers: [], orgMembersOutsideProject: [] }, parentTasks: [],
    availableSkills: [
      { id: 'skill-1', name: 'TypeScript', categoryCode: 'technology' },
      { id: 'skill-2', name: 'Stakeholder Communication', categoryCode: 'soft_skill' },
      { id: 'skill-3', name: 'On-time Delivery', categoryCode: 'delivery' },
    ],
    proficiencyLevels: [{ value: 'l7', label: 'L7 · Middle Solid' }], formError: '',
  }
}

describe('CreateTaskForm on the Project Board', () => {
  it('uses the same structured contract form as the other task entry point', async () => {
    render(CreateTaskForm, { props: buildProps() })

    expect(screen.getByRole('tab', { name: 'Nội dung Task' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByText('Cột hiện tại: To do')).not.toBeInTheDocument()
    expect(screen.getByText('Tên và phần việc')).toBeInTheDocument()
    expect(screen.getByText('Hiện trạng và ảnh hưởng')).toBeInTheDocument()
    expect(screen.getByText('Phần nằm trong Task')).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Mô tả/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Bối cảnh nghiệp vụ/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^Trạng thái/i)).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('tab', { name: 'Kỹ năng' }))
    expect(screen.getAllByText('Công nghệ').length).toBeGreaterThan(0)

    await fireEvent.click(screen.getByRole('tab', { name: 'Phân công' }))
    expect(screen.queryByLabelText(/Người thực hiện|Assigned to/i)).not.toBeInTheDocument()
    expect(screen.getByText(/mở luồng ứng tuyển/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Người nghiệm thu/i)).not.toBeRequired()

    await fireEvent.click(screen.getByRole('tab', { name: 'Kế hoạch' }))
    expect(screen.queryByText(/Ước tính giờ và ngày dự kiến/i)).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('tab', { name: 'Nghiệm thu' }))
    expect(screen.getByText('Đầu ra và chất lượng')).toBeInTheDocument()
    expect(screen.getByText('Tiêu chí nghiệm thu')).toBeInTheDocument()
  })

  it('opens the structured acceptance tab when its data is incomplete', async () => {
    const props = buildProps()
    props.errors = { brief_acceptance: 'Hãy thêm điều kiện, hành động và kết quả quan sát được' }
    render(CreateTaskForm, { props })

    expect(await screen.findByRole('tab', { name: /Nghiệm thu.*1/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Hãy thêm điều kiện, hành động và kết quả quan sát được', { selector: '[role="alert"]' })).toBeInTheDocument()
  })

  it('treats Docs as permanent Board information, not work to assign', () => {
    const props = buildProps()
    props.formData = { ...props.formData, task_status_id: 'docs' }
    props.statuses = [{ value: 'docs', label: 'Docs', slug: 'docs' }, { value: 'todo', label: 'To do', slug: 'todo' }]
    render(CreateTaskForm, { props })

    expect(screen.getByText('Mục Docs trên board')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Kỹ năng' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Phân công' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Kế hoạch' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Nghiệm thu' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Người thực hiện|Assigned to/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^Nội dung hoặc đường dẫn tài liệu/i)).toBeRequired()
  })
})
