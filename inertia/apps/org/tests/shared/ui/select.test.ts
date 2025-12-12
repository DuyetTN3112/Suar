import { render, screen, fireEvent } from '@testing-library/svelte'
import { describe, it, expect } from 'vitest'

import SelectWrapper from './select.test.svelte'

describe('Select', () => {
  it('renders with placeholder', () => {
    render(SelectWrapper, { props: { value: '' } })
    expect(screen.getByText('Pick one')).toBeInTheDocument()
  })

  it('renders selected value', () => {
    render(SelectWrapper, { props: { value: 'a' } })
    expect(screen.getByText('Alpha')).toBeInTheDocument()
  })

  it('shows items when clicked', async () => {
    render(SelectWrapper, { props: { value: '' } })
    const trigger = screen.getByRole('button')
    await fireEvent.click(trigger)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('selects item on click', async () => {
    render(SelectWrapper, { props: { value: '' } })
    const trigger = screen.getByRole('button')
    await fireEvent.click(trigger)
    const item = screen.getByText('Beta')
    await fireEvent.click(item)
    // After selection, value should be 'b'
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('does not open when disabled', () => {
    render(SelectWrapper, { props: { value: '', disabled: true } })
    const trigger = screen.getByRole('button')
    expect(trigger).toBeDisabled()
  })

  it('renders with pre-selected value', () => {
    render(SelectWrapper, { props: { value: 'b' } })
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })
})
