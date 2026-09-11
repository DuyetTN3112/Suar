import { fireEvent, render, screen, within } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

vi.unmock('@/apps/user/shared/stores/translation.svelte')

import TaskSkillsField from '@/apps/user/modules/tasks/components/modals/create_task_form/task_skills_field.svelte'

const proficiencyLevels = [
  { id: 'level-2', value: 'l2', label: 'L2 · Foundation' },
  { id: 'level-6', value: 'l6', label: 'L6 · Proficient' },
  { id: 'level-10', value: 'l10', label: 'L10 · Expert' },
]

const availableSkills = [
  {
    id: 'skill-svelte',
    projectSkillId: 'project-skill-svelte',
    name: 'Svelte',
    categoryCode: 'technology',
    minimumTaskRequirementLevelId: 'level-2',
    maximumTaskRequirementLevelId: 'level-10',
  },
  {
    id: 'skill-api',
    projectSkillId: 'project-skill-api',
    name: 'API Design',
    categoryCode: 'engineering',
    minimumTaskRequirementLevelId: 'level-6',
    maximumTaskRequirementLevelId: 'level-10',
  },
  {
    id: 'skill-legacy',
    projectSkillId: 'project-skill-legacy',
    name: 'Legacy integration',
    categoryCode: 'technology',
    minimumTaskRequirementLevelId: null,
    maximumTaskRequirementLevelId: null,
  },
]

describe('TaskSkillsField', () => {
  it('hiển thị kỹ năng task như một mức tối thiểu, không phải mức mục tiêu hoặc trần đánh giá', () => {
    render(TaskSkillsField, {
      props: {
        requiredSkills: [
          {
            id: 'skill-api',
            name: 'API Design',
            level: 'l6',
            categoryCode: 'engineering',
            minimum_level_id: 'level-6',
            target_level_id: undefined,
            assessment_ceiling_level_id: undefined,
          },
        ],
        onAddSkill: vi.fn(),
        onRemoveSkill: vi.fn(),
        availableSkills,
        proficiencyLevels,
      },
    })

    expect(screen.getByText('Kỹ năng tối thiểu để nhận task')).toBeInTheDocument()
    expect(screen.getByText('Mức tối thiểu: L6 · Proficient')).toBeInTheDocument()
    expect(screen.queryByText(/Target:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Ceiling:/i)).not.toBeInTheDocument()
  })

  it('chỉ cho chọn kỹ năng đã cấu hình đủ cả cận dưới và cận trên tại Project', () => {
    render(TaskSkillsField, {
      props: { requiredSkills: [], onAddSkill: vi.fn(), onRemoveSkill: vi.fn(), availableSkills, proficiencyLevels },
    })

    const select = screen.getByLabelText('Technology skill')
    expect(within(select).getByRole('option', { name: /Svelte/ })).not.toBeDisabled()
    expect(within(select).getByRole('option', { name: /Legacy integration/ })).toBeDisabled()
  })

  it('chỉ gửi mức tối thiểu nằm trong khoảng Project đã chọn', async () => {
    const onAddSkill = vi.fn()
    render(TaskSkillsField, {
      props: { requiredSkills: [], onAddSkill, onRemoveSkill: vi.fn(), availableSkills, proficiencyLevels },
    })

    await fireEvent.change(screen.getByLabelText('Technology skill'), {
      target: { value: 'skill-svelte' },
    })
    const levelSelect = screen.getByLabelText('Technology level')
    expect(within(levelSelect).getByRole('option', { name: 'L2 · Foundation' })).toBeInTheDocument()
    expect(within(levelSelect).getByRole('option', { name: 'L6 · Proficient' })).toBeInTheDocument()
    expect(within(levelSelect).getByRole('option', { name: 'L10 · Expert' })).toBeInTheDocument()

    await fireEvent.change(levelSelect, { target: { value: 'l6' } })
    await fireEvent.click(screen.getByRole('button', { name: 'Add Technology' }))

    expect(onAddSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'skill-svelte',
        project_skill_id: 'project-skill-svelte',
        level: 'l6',
        minimum_level_id: 'level-6',
        target_level_id: 'level-6',
        assessment_ceiling_level_id: 'level-10',
        assessment_ceiling_level_code: 'l10',
      })
    )
  })

  it('không tạo kỹ năng tự do ngoài danh mục kỹ năng của Project', async () => {
    render(TaskSkillsField, {
      props: { requiredSkills: [], onAddSkill: vi.fn(), onRemoveSkill: vi.fn(), availableSkills, proficiencyLevels },
    })

    await fireEvent.input(screen.getByLabelText('Search Technology skills'), {
      target: { value: 'GraphQL Federation' },
    })

    expect(screen.queryByRole('button', { name: /Add custom skill/i })).not.toBeInTheDocument()
  })
})
