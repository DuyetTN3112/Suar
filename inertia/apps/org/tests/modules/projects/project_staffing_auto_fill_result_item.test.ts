import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import ProjectStaffingAutoFillResultItem from '@/apps/org/modules/projects/components/project_staffing_auto_fill_result_item.svelte'

describe('ProjectStaffingAutoFillResultItem', () => {
  it('renders success result with explainability context', () => {
    const onRetry = vi.fn()
    const onOpenMatching = vi.fn()

    render(ProjectStaffingAutoFillResultItem, {
      props: {
        result: {
          roleId: 'role-1',
          roleName: 'Backend Lead',
          candidateUserId: 'user-1',
          candidateUsername: 'duyet',
          actionType: 'add_member',
          status: 'success',
          reviewedSkillsCount: 2,
          importedSkillsCount: 1,
          underDisputeSkillsCount: 1,
          latestConfidenceSignal: 'high',
          matchedSkills: 3,
          totalRequiredSkills: 4,
          skillGaps: ['Leadership'],
        },
        onRetry,
        onOpenMatching,
      },
    })

    expect(screen.getByText(/Backend Lead/i)).toBeInTheDocument()
    expect(screen.getByText(/thêm mới/i)).toBeInTheDocument()
    expect(screen.getByText(/duyet/i)).toBeInTheDocument()
    expect(screen.getByText('3/4 kỹ năng')).toBeInTheDocument()
    expect(screen.getByText('2 reviewed · 1 imported')).toBeInTheDocument()
    expect(screen.getByText('Confidence High')).toBeInTheDocument()
    expect(screen.getByText('1 skill dispute')).toBeInTheDocument()
    expect(screen.getByText(/Kỹ năng còn thiếu: Leadership/i)).toBeInTheDocument()

    expect(onRetry).not.toHaveBeenCalled()
    expect(onOpenMatching).not.toHaveBeenCalled()
  })

  it('renders error actions for failed result', async () => {
    const onRetry = vi.fn()
    const onOpenMatching = vi.fn()

    render(ProjectStaffingAutoFillResultItem, {
      props: {
        result: {
          roleId: 'role-2',
          roleName: 'QA Lead',
          candidateUserId: 'user-2',
          candidateUsername: 'alex',
          actionType: 'update_member',
          status: 'error',
          errorMessage: 'Cannot assign candidate',
          reviewedSkillsCount: null,
          importedSkillsCount: null,
          underDisputeSkillsCount: null,
          latestConfidenceSignal: null,
          matchedSkills: null,
          totalRequiredSkills: null,
          skillGaps: [],
        },
        onRetry,
        onOpenMatching,
      },
    })

    expect(screen.getByText(/Cannot assign candidate/i)).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: /Thử lại/i }))
    expect(onRetry).toHaveBeenCalledWith('role-2')

    await fireEvent.click(screen.getByRole('button', { name: /Chọn tay/i }))
    expect(onOpenMatching).toHaveBeenCalledWith('role-2')
  })
})
