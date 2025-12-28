import { render } from '@testing-library/svelte'
import { describe, it, expect } from 'vitest'

import Dialog from '@/apps/user/shared/ui/dialog.svelte'

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
})
