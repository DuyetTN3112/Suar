import { render, screen, fireEvent } from '@testing-library/svelte'
import { describe, it, expect } from 'vitest'

import CheckboxWrapper from './checkbox.test.svelte'

const getCheckbox = () => {
  const checkbox = screen.getByRole('checkbox')
  if (!(checkbox instanceof HTMLButtonElement)) {
    throw new TypeError('Expected checkbox button element')
  }
  return checkbox
}

describe('Checkbox', () => {
  it('renders unchecked by default', () => {
    render(CheckboxWrapper, { props: {} })
    const cb = getCheckbox()
    expect(cb.getAttribute('aria-checked')).toBe('false')
  })

  it('renders checked when prop is true', () => {
    render(CheckboxWrapper, { props: { checked: true } })
    const cb = getCheckbox()
    expect(cb.getAttribute('aria-checked')).toBe('true')
  })

  it('toggles on click', async () => {
    render(CheckboxWrapper, { props: { checked: false } })
    const cb = getCheckbox()
    await fireEvent.click(cb)
    expect(cb.getAttribute('aria-checked')).toBe('true')
  })

  it('does not toggle when disabled', async () => {
    render(CheckboxWrapper, { props: { checked: false, disabled: true } })
    const cb = getCheckbox()
    await fireEvent.click(cb)
    expect(cb.getAttribute('aria-checked')).toBe('false')
  })

  it('supports bindable checked', async () => {
    render(CheckboxWrapper, { props: { checked: false } })
    const cb = getCheckbox()
    await fireEvent.click(cb)
    expect(cb.getAttribute('aria-checked')).toBe('true')
    await fireEvent.click(cb)
    expect(cb.getAttribute('aria-checked')).toBe('false')
  })

  it('renders with id', () => {
    render(CheckboxWrapper, { props: { id: 'my-cb' } })
    const cb = getCheckbox()
    expect(cb.id).toBe('my-cb')
  })

  it('has aria-checked reflecting state', () => {
    render(CheckboxWrapper, { props: { checked: true } })
    const cb = getCheckbox()
    expect(cb.getAttribute('aria-checked')).toBe('true')
  })

  it('handles rapid toggling', async () => {
    render(CheckboxWrapper, { props: { checked: false } })
    const cb = getCheckbox()
    await fireEvent.click(cb)
    await fireEvent.click(cb)
    await fireEvent.click(cb)
    expect(cb.getAttribute('aria-checked')).toBe('true')
  })
})
