import { fireEvent, render, screen, within } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

vi.unmock('@/apps/org/shared/stores/translation.svelte')

import TaskSkillsField from '@/apps/org/modules/tasks/components/modals/create_task_form/task_skills_field.svelte'

interface AddedSkillPayload {
  id: string
  name: string
  level: string
  categoryCode?: string | null
  custom_name?: string
  requirement_source?: string
  rubric_version_id?: string | null
}

describe('TaskSkillsField', () => {
  it('shows semantic requirement details for prefilled role-based skills', () => {
    render(TaskSkillsField, {
      props: {
        requiredSkills: [
          {
            id: 'skill-1',
            name: 'API Design',
            level: 'l7',
            categoryCode: 'engineering',
            minimum_level_id: 'level-min',
            target_level_id: 'level-target',
            assessment_ceiling_level_id: 'level-ceiling',
            is_mandatory: true,
            importance: 'critical',
            weight: 1.5,
            requirement_source: 'professional_role_prefill',
            requirement_notes: 'Inherited from Backend Lead role baseline.',
          },
        ],
        onAddSkill: vi.fn(),
        onRemoveSkill: vi.fn(),
        availableSkills: [
          { id: 'skill-1', name: 'API Design', categoryCode: 'engineering' },
          { id: 'skill-2', name: 'TypeScript', categoryCode: 'technology' },
          { id: 'skill-3', name: 'Collaboration', categoryCode: 'soft_skill' },
          { id: 'skill-4', name: 'Release Planning', categoryCode: 'delivery' },
        ],
        proficiencyLevels: [
          { value: 'l4', label: 'L4 · Junior Solid' },
          { value: 'l7', label: 'L7 · Middle Solid' },
        ],
      },
    })

    expect(screen.getAllByText('Technology').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Software engineering').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Soft skills').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Delivery').length).toBeGreaterThan(0)
    expect(screen.getByText(/Role prefill/i)).toBeInTheDocument()
    expect(screen.getByText(/Mandatory/i)).toBeInTheDocument()
    expect(screen.getByText(/critical/i)).toBeInTheDocument()
    expect(screen.getByText(/Weight 1.5/i)).toBeInTheDocument()
    expect(screen.getByText(/Inherited from Backend Lead role baseline/i)).toBeInTheDocument()
    expect(screen.getByText(/Min:/i)).toBeInTheDocument()
    expect(screen.getByText(/Target:/i)).toBeInTheDocument()
    expect(screen.getByText(/Ceiling:/i)).toBeInTheDocument()
  })

  it('filters available skills inside a collapsed category dropdown', async () => {
    render(TaskSkillsField, {
      props: {
        requiredSkills: [],
        onAddSkill: vi.fn(),
        onRemoveSkill: vi.fn(),
        availableSkills: [
          { id: 'skill-react', name: 'React', categoryCode: 'technology' },
          {
            id: 'skill-redis',
            name: 'Redis Streams',
            categoryCode: 'technology',
            rubricVersionId: 'rubric-version-redis',
          },
          { id: 'skill-api', name: 'API Design', categoryCode: 'engineering' },
        ],
        proficiencyLevels: [{ value: 'l4', label: 'L4 · Junior Solid' }],
      },
    })

    await fireEvent.input(screen.getByLabelText('Search Technology skills'), {
      target: { value: 'redis' },
    })

    const skillSelect = screen.getByLabelText('Technology skill')

    expect(skillSelect.tagName).toBe('SELECT')
    expect(within(skillSelect).getByRole('option', { name: 'Redis Streams' })).toBeInTheDocument()
    expect(within(skillSelect).queryByRole('option', { name: 'React' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Redis Streams' })).not.toBeInTheDocument()
  })

  it('deduplicates repeated catalog skill names inside a category dropdown', () => {
    render(TaskSkillsField, {
      props: {
        requiredSkills: [],
        onAddSkill: vi.fn(),
        onRemoveSkill: vi.fn(),
        availableSkills: [
          { id: 'skill-ts-project', name: 'TypeScript QA Automation', categoryCode: 'technology' },
          { id: 'skill-ts-role', name: 'TypeScript QA Automation', categoryCode: 'technology' },
          { id: 'skill-api', name: 'API Design', categoryCode: 'engineering' },
        ],
        proficiencyLevels: [{ value: 'l4', label: 'L4 · Junior Solid' }],
      },
    })

    const skillSelect = screen.getByLabelText('Technology skill')

    expect(
      within(skillSelect).getAllByRole('option', { name: 'TypeScript QA Automation' })
    ).toHaveLength(1)
  })

  it('adds a catalog skill selected from the category dropdown', async () => {
    const onAddSkill = vi.fn<(skill: AddedSkillPayload) => void>()

    render(TaskSkillsField, {
      props: {
        requiredSkills: [],
        onAddSkill,
        onRemoveSkill: vi.fn(),
        availableSkills: [
          { id: 'skill-react', name: 'React', categoryCode: 'technology' },
          {
            id: 'skill-redis',
            name: 'Redis Streams',
            categoryCode: 'technology',
            rubricVersionId: 'rubric-version-redis',
          },
          { id: 'skill-api', name: 'API Design', categoryCode: 'engineering' },
        ],
        proficiencyLevels: [
          { value: 'l4', label: 'L4 · Junior Solid' },
          { value: 'l7', label: 'L7 · Middle Solid' },
        ],
      },
    })

    await fireEvent.change(screen.getByLabelText('Technology skill'), {
      target: { value: 'skill-redis' },
    })
    await fireEvent.change(screen.getByLabelText('Technology level'), {
      target: { value: 'l7' },
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Add Technology' }))

    expect(onAddSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'skill-redis',
        name: 'Redis Streams',
        level: 'l7',
        categoryCode: 'technology',
        rubric_version_id: 'rubric-version-redis',
      })
    )
  })

  it('adds the exact catalog match when typing search text and pressing add', async () => {
    const onAddSkill = vi.fn<(skill: AddedSkillPayload) => void>()

    render(TaskSkillsField, {
      props: {
        requiredSkills: [],
        onAddSkill,
        onRemoveSkill: vi.fn(),
        availableSkills: [
          { id: 'skill-react', name: 'React', categoryCode: 'technology' },
          { id: 'skill-redis', name: 'Redis Streams', categoryCode: 'technology' },
        ],
        proficiencyLevels: [{ value: 'l4', label: 'L4 · Junior Solid' }],
      },
    })

    const searchInput = screen.getByLabelText('Search Technology skills')
    await fireEvent.input(searchInput, { target: { value: 'React' } })
    await fireEvent.click(
      within(searchInput.closest('section') as HTMLElement).getByRole('button', {
        name: 'Add Technology',
      })
    )

    expect(onAddSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'skill-react',
        name: 'React',
        level: 'l4',
        categoryCode: 'technology',
      })
    )
  })

  it('adds the only filtered catalog skill when typing partial search text and pressing add', async () => {
    const onAddSkill = vi.fn<(skill: AddedSkillPayload) => void>()

    render(TaskSkillsField, {
      props: {
        requiredSkills: [],
        onAddSkill,
        onRemoveSkill: vi.fn(),
        availableSkills: [
          { id: 'skill-react', name: 'React', categoryCode: 'technology' },
          { id: 'skill-redis', name: 'Redis Streams', categoryCode: 'technology' },
        ],
        proficiencyLevels: [{ value: 'l4', label: 'L4 · Junior Solid' }],
      },
    })

    const searchInput = screen.getByLabelText('Search Technology skills')
    await fireEvent.input(searchInput, { target: { value: 'redis' } })
    await fireEvent.click(
      within(searchInput.closest('section') as HTMLElement).getByRole('button', {
        name: 'Add Technology',
      })
    )

    expect(onAddSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'skill-redis',
        name: 'Redis Streams',
        level: 'l4',
        categoryCode: 'technology',
      })
    )
  })

  it('adds a custom skill from search text when catalog has no match', async () => {
    const onAddSkill = vi.fn<(skill: AddedSkillPayload) => void>()

    render(TaskSkillsField, {
      props: {
        requiredSkills: [],
        onAddSkill,
        onRemoveSkill: vi.fn(),
        availableSkills: [{ id: 'skill-react', name: 'React', categoryCode: 'technology' }],
        proficiencyLevels: [{ value: 'l4', label: 'L4 · Junior Solid' }],
      },
    })

    await fireEvent.input(screen.getByLabelText('Search Technology skills'), {
      target: { value: 'GraphQL Federation' },
    })
    await fireEvent.click(
      screen.getByRole('button', { name: 'Add custom skill: GraphQL Federation' })
    )

    expect(onAddSkill).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'GraphQL Federation',
        level: 'l4',
        categoryCode: 'technology',
        custom_name: 'GraphQL Federation',
        requirement_source: 'manual',
      })
    )
    expect(onAddSkill.mock.calls[0]?.[0].id).toMatch(/^custom:technology:/)
  })
})
