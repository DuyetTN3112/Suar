import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, it, expect } from 'vitest'

import Dialog from '@/apps/user/shared/ui/dialog.svelte'

import DialogTest from './dialog.test.svelte'

describe('Dialog', () => {
  it('renders dialog content when open is true', () => {
    const { container } = render(Dialog, {
      props: { open: true },
    })
    const backdrop = container.querySelector('[data-state="open"]')
    expect(backdrop).not.toBeNull()
  })

  it('does not render dialog when open is false', () => {
    const { container } = render(Dialog, {
      props: { open: false },
    })
    const backdrop = container.querySelector('[data-state="open"]')
    expect(backdrop).toBeNull()
  })

  it('toggles open state', () => {
    let open = true
    const { container, rerender } = render(Dialog, {
      props: { open },
    })
    expect(container.querySelector('[data-state="open"]')).not.toBeNull()

    open = false
    void rerender({ open })
    expect(container.querySelector('[data-state="open"]')).toBeNull()
  })

  it('does not close when a child input receives keyboard shortcuts', async () => {
    render(DialogTest, { props: { open: true } })

    const input = screen.getByRole('textbox', { name: 'Dialog input' })
    for (const key of [' ', '.', 'Enter', 'Escape']) {
      await fireEvent.keyDown(input, { key })
      expect(input).toBeInTheDocument()
      expect(document.querySelector('[data-state="open"]')).not.toBeNull()
    }
  })

  it('closes from the backdrop but not from dialog content', async () => {
    const { container } = render(DialogTest, { props: { open: true } })

    await fireEvent.click(screen.getByText('Dialog content'))
    expect(container.querySelector('[data-state="open"]')).not.toBeNull()

    const backdrop = container.querySelector('[data-state="open"]')
    expect(backdrop).not.toBeNull()
    await fireEvent.click(backdrop as HTMLElement)
    expect(container.querySelector('[data-state="open"]')).toBeNull()
  })
})
