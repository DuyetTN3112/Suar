import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import ProjectStaffingAutoFillPreviewItem from '@/apps/org/modules/projects/components/project_staffing_auto_fill_preview_item.svelte'

describe('ProjectStaffingAutoFillPreviewItem', () => {
  it('renders explainability and assignment context for a candidate', async () => {
    const onToggle = vi.fn()

    render(ProjectStaffingAutoFillPreviewItem, {
      props: {
        item: {
          roleId: 'role-1',
          roleName: 'Backend Lead',
          excluded: false,
          actionType: 'add_member',
          candidate: {
            userId: 'user-1',
            username: 'duyet',
            source: 'org_member',
            matchScore: 91,
            matchedSkills: 3,
            totalRequiredSkills: 4,
            skillGaps: ['Leadership'],
            reviewedSkillsCount: 2,
            importedSkillsCount: 1,
            underDisputeSkillsCount: 1,
            latestConfidenceSignal: 'high',
          },
        },
        onToggle,
      },
    })

    expect(screen.getByText('Backend Lead')).toBeInTheDocument()
    expect(screen.getByText(/duyet/i)).toBeInTheDocument()
    expect(screen.getByText('3/4 kỹ năng')).toBeInTheDocument()
    expect(screen.getByText(/Kỹ năng còn thiếu: Leadership/i)).toBeInTheDocument()
    expect(screen.getByText('2 reviewed · 1 imported')).toBeInTheDocument()
    expect(screen.getByText('Confidence High')).toBeInTheDocument()
    expect(screen.getByText('1 skill dispute')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: /Bỏ khỏi batch/i }))
    expect(onToggle).toHaveBeenCalledWith('role-1')
  })

  it('renders empty-state copy when no safe candidate exists', () => {
    render(ProjectStaffingAutoFillPreviewItem, {
      props: {
        item: {
          roleId: 'role-2',
          roleName: 'QA Lead',
          excluded: true,
          actionType: null,
          candidate: null,
        },
        onToggle: vi.fn(),
      },
    })

    expect(screen.getByText('Chưa có ứng viên.')).toBeInTheDocument()
    expect(screen.getByText('Đã bỏ khỏi batch.')).toBeInTheDocument()
  })
})
