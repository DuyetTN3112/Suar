import React from 'react'
import { Toaster as Sonner, ToasterProps } from 'sonner'
import { useTheme } from '@/hooks/theme'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return React.createElement(Sonner, {
    theme: theme as ToasterProps['theme'],
    className: 'toaster group [&_div[data-content]]:w-full',
    style: {
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
    } as React.CSSProperties,
    ...props
  })
}

export { Toaster }
