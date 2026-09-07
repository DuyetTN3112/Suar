import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import { createEmptyTaskBrief } from '@/apps/shared/tasks/task_brief_contract'
import CreateTaskForm from '@/apps/user/modules/tasks/components/modals/create_task_form.svelte'
import type { TaskCreateFormData } from '@/apps/user/modules/tasks/types/create_form_types'

function buildProps() {
  return {
    formData: {
      title: '', description: '', task_status_id: 'todo', task_type: 'feature_development',
      verification_method: 'code_review', project_id: 'project-1', priority: 'high', label: 'backend',
      task_visibility: 'internal', assigned_to: '', reviewer_user_id: '', due_date: '',
      parent_task_id: '', estimated_time: '0', required_skills: [], acceptance_criteria: '',
      context_background: '', role_in_task: '', business_domain: '', problem_category: '',
      tech_stack_text: '', learning_objectives_text: '', domain_tags_text: '', brief: createEmptyTaskBrief(),
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

describe('CreateTaskForm', () => {
  it('does not render a readiness score', () => {
    render(CreateTaskForm, { props: buildProps() })
    expect(screen.queryByTestId('task-create-readiness')).not.toBeInTheDocument()
    expect(screen.queryByText(/Mức độ sẵn sàng|Readiness/)).not.toBeInTheDocument()
  })

  it('creates from the selected Board column and collects a structured brief', async () => {
    render(CreateTaskForm, { props: buildProps() })

    expect(screen.getByRole('tab', { name: 'Nội dung Task' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByText('Cột hiện tại: To do')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^Trạng thái/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Tiêu đề/i)).toBeInTheDocument()
    expect(screen.getByText('Tên và phần việc')).toBeInTheDocument()
    expect(screen.getByText('Hiện trạng và ảnh hưởng')).toBeInTheDocument()
    expect(screen.getByText('Phần nằm trong Task')).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Mô tả/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Bối cảnh nghiệp vụ/i)).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('tab', { name: 'Kỹ năng' }))
    expect(screen.getByRole('tab', { name: 'Kỹ năng' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByText('Công nghệ').length).toBeGreaterThan(0)

    await fireEvent.click(screen.getByRole('tab', { name: 'Phân công' }))
    expect(screen.getByRole('tab', { name: 'Phân công' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByLabelText(/Người thực hiện|Assigned to/i)).not.toBeInTheDocument()
    expect(screen.getByText(/mở luồng ứng tuyển/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Người nghiệm thu/i)).not.toBeRequired()
    expect(screen.getAllByText(/Chỉ trong tổ chức/i).length).toBeGreaterThan(0)

    await fireEvent.click(screen.getByRole('tab', { name: 'Kế hoạch' }))
    expect(screen.getByRole('tab', { name: 'Kế hoạch' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByText(/Ước tính giờ và ngày dự kiến/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Chỉ trong tổ chức/i)).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('tab', { name: 'Nghiệm thu' }))
    expect(screen.getByRole('tab', { name: 'Nghiệm thu' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Đầu ra và chất lượng')).toBeInTheDocument()
    expect(screen.getByText('Tiêu chí nghiệm thu')).toBeInTheDocument()
    expect(screen.getByText('Tài liệu tham khảo (tùy chọn)')).toBeInTheDocument()
  })

  it('moves to the structured contract tab when an acceptance criterion is incomplete', async () => {
    const props = buildProps()
    props.errors = { brief_acceptance: 'Hãy thêm điều kiện, hành động và kết quả quan sát được' }
    render(CreateTaskForm, { props })

    expect(await screen.findByRole('tab', { name: /Nghiệm thu.*1/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Hãy thêm điều kiện, hành động và kết quả quan sát được', { selector: '[role="alert"]' })).toBeInTheDocument()
  })

  it('keeps worker and reviewer controls separate for direct project assignment', async () => {
    const props = buildProps()
    props.formData = { ...props.formData, task_visibility: 'project' }
    props.assigneeGroups = {
      projectMembers: [{ id: 'user-1', username: 'alex', email: 'alex@example.com' }],
      orgMembersOutsideProject: [],
    }
    render(CreateTaskForm, { props })

    await fireEvent.click(screen.getByRole('tab', { name: 'Phân công' }))
    expect(screen.getByRole('button', { name: /Người thực hiện \(chọn 1 người\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Người nghiệm thu/i })).toBeInTheDocument()
  })

  it('does not offer a direct reviewer selector outside project scope', async () => {
    const props = buildProps()
    props.formData = { ...props.formData, task_visibility: 'project', reviewer_visibility: 'internal' }
    render(CreateTaskForm, { props })

    await fireEvent.click(screen.getByRole('tab', { name: 'Phân công' }))
    expect(screen.queryByRole('button', { name: /Người nghiệm thu/i })).not.toBeInTheDocument()
    expect(screen.getAllByText(/mở luồng ứng tuyển/i).length).toBeGreaterThan(0)
  })

  it('treats Docs as permanent Board information rather than work to assign', () => {
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
