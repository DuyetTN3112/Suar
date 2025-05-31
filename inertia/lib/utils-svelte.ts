/**
 * Svelte 5 utility functions for shadcn-svelte
 *
 * Các helper functions dùng chung cho components Svelte.
 * Tương tự lib/utils.ts cho React shadcn/ui.
 */

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { tv, type VariantProps } from 'tailwind-variants'

/**
 * Merge Tailwind CSS classes với clsx
 * Giống cn() trong React shadcn/ui
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Re-export tailwind-variants cho component variants
 */
export { tv, type VariantProps }

/**
 * Flyout animation helper for Bits UI
 */
export const flyAndScale = (
  node: Element,
  params: { y?: number; x?: number; start?: number; duration?: number } = {}
) => {
  const { y = -8, x = 0, start = 0.95, duration = 150 } = params

  const style = getComputedStyle(node)
  const transform = style.transform === 'none' ? '' : style.transform

  const scaleConversion = (valueA: number, scaleA: [number, number], scaleB: [number, number]) => {
    const [minA, maxA] = scaleA
    const [minB, maxB] = scaleB
    const percentage = (valueA - minA) / (maxA - minA)
    return percentage * (maxB - minB) + minB
  }

  const styleToString = (style: Record<string, number | string | undefined>) => {
    return Object.keys(style).reduce((str, key) => {
      if (style[key] === undefined) return str
      return str + `${key}:${style[key]};`
    }, '')
  }

  return {
    duration,
    delay: 0,
    css: (t: number) => {
      const y_val = scaleConversion(t, [0, 1], [y, 0])
      const x_val = scaleConversion(t, [0, 1], [x, 0])
      const scale = scaleConversion(t, [0, 1], [start, 1])

      return styleToString({
        transform: `${transform} translate3d(${x_val}px, ${y_val}px, 0) scale(${scale})`,
        opacity: t,
      })
    },
    easing: (t: number) => t * (2 - t), // ease-out-quad
  }
}
