import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import ProjectMemberCard from '@/apps/org/modules/projects/components/project_member_card.svelte'

describe('ProjectMemberCard', () => {
  it('renders member explainability summary in staffing maintenance view', () => {
    render(ProjectMemberCard, {
      props: {
        member: {
          user_id: 'user-1',
          username: 'duyet',
          email: 'duyet@example.com',
          role: 'project_member',
          project_professional_role_id: 'role-1',
          professional_role_name: 'Backend Lead',
          task_count: 3,
          reviewed_skills_count: 2,
          imported_skills_count: 1,
          under_dispute_skills_count: 1,
          latest_confidence_signal: 'high',
        },
        canManage: false,
        projectProfessionalRoles: [],
        getMemberInitials: () => 'D',
        onUpdateMemberRole: vi.fn(),
        onRemoveMember: vi.fn(),
      },
    })

    expect(screen.getByText('duyet')).toBeInTheDocument()
    expect(screen.getByText('Quản trị: Thành viên')).toBeInTheDocument()
    expect(screen.getByText('Thực thi: Backend Lead')).toBeInTheDocument()
    expect(screen.getByText('3 công việc')).toBeInTheDocument()
    expect(screen.getByText('2 reviewed · 1 imported')).toBeInTheDocument()
    expect(screen.getByText('Confidence High')).toBeInTheDocument()
    expect(screen.getByText('1 skill dispute')).toBeInTheDocument()
  })
})
