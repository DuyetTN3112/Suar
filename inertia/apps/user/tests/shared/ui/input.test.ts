import { render, screen, fireEvent } from '@testing-library/svelte'
import { describe, it, expect } from 'vitest'

import InputWrapper from './input.test.svelte'

const expectInputElement = (element: HTMLElement) => {
  if (!(element instanceof HTMLInputElement)) {
    throw new TypeError('Expected input element')
  }
  return element
}

const getTextbox = () => expectInputElement(screen.getByRole('textbox'))
const getSpinbutton = () => expectInputElement(screen.getByRole('spinbutton'))

describe('Input', () => {
  it('renders with default text type', () => {
    render(InputWrapper, { props: { value: 'hello' } })
    const input = getTextbox()
    expect(input.value).toBe('hello')
  })

  it('updates value via bindable', async () => {
    render(InputWrapper, { props: { value: '' } })
    const input = getTextbox()
    await fireEvent.input(input, { target: { value: 'typed' } })
    expect(input.value).toBe('typed')
  })

  it('renders placeholder text', () => {
    render(InputWrapper, { props: { placeholder: 'Enter name' } })
    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument()
  })

  it('does not render when no value and no placeholder', () => {
    render(InputWrapper, { props: { value: '' } })
    const input = getTextbox()
    expect(input.value).toBe('')
  })

  it('respects disabled prop', () => {
    render(InputWrapper, { props: { disabled: true, value: 'test' } })
    const input = getTextbox()
    expect(input.disabled).toBe(true)
  })

  it('does not update when disabled', async () => {
    render(InputWrapper, { props: { disabled: true, value: 'locked' } })
    const input = getTextbox()
    await fireEvent.input(input, { target: { value: 'hacked' } })
    expect(input.value).toBe('locked')
  })

  it('applies custom class', () => {
    render(InputWrapper, { props: { class: 'my-input', value: '' } })
    const input = getTextbox()
    expect(input.className).toContain('my-input')
  })

  it('renders with number type', () => {
    render(InputWrapper, { props: { type: 'number', value: '42' } })
    const input = getSpinbutton()
    expect(input.type).toBe('number')
  })

  it('handles empty string value without crash', () => {
    render(InputWrapper, { props: { value: '' } })
    const input = getTextbox()
    expect(input.value).toBe('')
  })

  it('handles rapid input changes', async () => {
    render(InputWrapper, { props: { value: '' } })
    const input = getTextbox()
    await fireEvent.input(input, { target: { value: 'a' } })
    await fireEvent.input(input, { target: { value: 'ab' } })
    await fireEvent.input(input, { target: { value: 'abc' } })
    expect(input.value).toBe('abc')
  })

  it('preserves value after blur', async () => {
    render(InputWrapper, { props: { value: 'persist' } })
    const input = getTextbox()
    await fireEvent.focus(input)
    await fireEvent.blur(input)
    expect(input.value).toBe('persist')
  })
})
