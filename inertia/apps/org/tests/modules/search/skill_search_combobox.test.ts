import { fireEvent, render, screen, within } from '@testing-library/svelte'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import SkillSearchCombobox from '@/apps/org/modules/search/components/skill_search_combobox.svelte'

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

function triggerCombobox() {
  const trigger = screen.getAllByRole('combobox').find((element) => element.tagName === 'BUTTON')
  expect(trigger).toBeDefined()
  return trigger as HTMLElement
}

const skills = [
  {
    id: 'skill-api',
    skillName: 'API Design',
    categoryCode: 'engineering',
    aliases: ['REST contracts'],
  },
  {
    id: 'skill-ts',
    skillName: 'TypeScript',
    categoryCode: 'technology',
    aliases: ['static typing'],
  },
  {
    id: 'skill-comm',
    skillName: 'Clear Communication',
    categoryCode: 'soft_skill',
    aliases: ['stakeholder writing'],
  },
  {
    id: 'skill-release',
    skill_name: 'Release Ownership',
    category_code: 'delivery',
    aliases: ['ship readiness'],
  },
]

describe('SkillSearchCombobox', () => {
  it('groups active skills and filters by alias/category/name', async () => {
    render(SkillSearchCombobox, {
      props: {
        skills,
        value: '',
        placeholder: 'Choose skill',
      },
    })

    await fireEvent.click(triggerCombobox())

    expect(screen.getByText('API Design')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText('Clear Communication')).toBeInTheDocument()
    expect(screen.getByText('Release Ownership')).toBeInTheDocument()
    expect(screen.getByText('Technology')).toBeInTheDocument()
    expect(screen.getByText('Engineering')).toBeInTheDocument()

    await fireEvent.input(screen.getByPlaceholderText('Tìm theo tên hoặc alias...'), {
      target: { value: 'ship readiness' },
    })

    expect(screen.getByText('Release Ownership')).toBeInTheDocument()
    expect(screen.queryByText('API Design')).not.toBeInTheDocument()

    await fireEvent.input(screen.getByPlaceholderText('Tìm theo tên hoặc alias...'), {
      target: { value: 'engineering' },
    })

    expect(screen.getByText('API Design')).toBeInTheDocument()
    expect(screen.queryByText('TypeScript')).not.toBeInTheDocument()
    expect(screen.queryByText('Clear Communication')).not.toBeInTheDocument()
  })

  it('selects a skill and exposes the selected label', async () => {
    const onSelect = vi.fn()
    render(SkillSearchCombobox, {
      props: {
        skills,
        value: '',
        placeholder: 'Choose skill',
        onSelect,
      },
    })

    await fireEvent.click(triggerCombobox())
    await fireEvent.click(screen.getByText('Clear Communication'))

    expect(onSelect).toHaveBeenCalledWith('skill-comm', skills[2])
    expect(within(triggerCombobox()).getByText('Clear Communication')).toBeInTheDocument()
  })

  it('renders empty state when no skill matches', async () => {
    render(SkillSearchCombobox, {
      props: {
        skills,
        value: '',
      },
    })

    await fireEvent.click(triggerCombobox())
    await fireEvent.input(screen.getByPlaceholderText('Tìm theo tên hoặc alias...'), {
      target: { value: 'nonexistent skill' },
    })

    expect(screen.getByText('Không tìm thấy skill nào.')).toBeInTheDocument()
  })
})
