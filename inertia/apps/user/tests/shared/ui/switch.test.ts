import { render, screen, fireEvent } from '@testing-library/svelte'
import { describe, it, expect } from 'vitest'

import SwitchWrapper from './switch.test.svelte'

const getSwitch = () => {
  const switchElement = screen.getByRole('switch')
  if (!(switchElement instanceof HTMLButtonElement)) {
    throw new TypeError('Expected switch button element')
  }
  return switchElement
}

describe('Switch', () => {
  it('renders unchecked by default', () => {
    render(SwitchWrapper, { props: {} })
    const sw = getSwitch()
    expect(sw.getAttribute('aria-checked')).toBe('false')
  })

  it('toggles on click', async () => {
    render(SwitchWrapper, { props: { checked: false } })
    const sw = getSwitch()
    await fireEvent.click(sw)
    expect(sw.getAttribute('aria-checked')).toBe('true')
  })

  it('does not toggle when disabled', async () => {
    render(SwitchWrapper, { props: { checked: false, disabled: true } })
    const sw = getSwitch()
    await fireEvent.click(sw)
    expect(sw.getAttribute('aria-checked')).toBe('false')
  })

  it('supports bindable', async () => {
    render(SwitchWrapper, { props: { checked: false } })
    const sw = getSwitch()
    await fireEvent.click(sw)
    expect(sw.getAttribute('aria-checked')).toBe('true')
  })

  it('has aria-checked reflecting state', () => {
    render(SwitchWrapper, { props: { checked: true } })
    const sw = getSwitch()
    expect(sw.getAttribute('aria-checked')).toBe('true')
  })

  it('handles rapid toggling', async () => {
    render(SwitchWrapper, { props: { checked: false } })
    const sw = getSwitch()
    await fireEvent.click(sw)
    await fireEvent.click(sw)
    await fireEvent.click(sw)
    expect(sw.getAttribute('aria-checked')).toBe('true')
  })
})
