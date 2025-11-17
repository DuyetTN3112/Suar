import { render } from '@testing-library/svelte'
import { describe, it, expect } from 'vitest'

import Button from '@/apps/admin/shared/ui/button.svelte'

describe('Button', () => {
  it('renders button element', () => {
    const { container } = render(Button, {
      props: { 'aria-label': 'Save' },
    })
    const button = container.querySelector('button')
    expect(button).not.toBeNull()
  })

  it('applies disabled attribute', () => {
    const { container } = render(Button, {
      props: { disabled: true, 'aria-label': 'Save' },
    })
    const button = container.querySelector('button')
    expect(button).toBeDisabled()
  })

  it('renders with variant prop without error', () => {
    const { container } = render(Button, {
      props: { variant: 'destructive', 'aria-label': 'Delete' },
    })
    const button = container.querySelector('button')
    expect(button).not.toBeNull()
  })

  it('spreads rest props', () => {
    const { container } = render(Button, {
      props: { type: 'submit', 'aria-label': 'Submit' },
    })
    const button = container.querySelector('button')
    expect(button?.getAttribute('type')).toBe('submit')
  })
})
