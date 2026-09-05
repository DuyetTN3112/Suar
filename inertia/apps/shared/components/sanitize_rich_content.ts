import type { TvaJsonValue } from '#modules/tasks/public_contracts/task-authoring/primitives'

const ALLOWED_ELEMENTS = new Set([
  'A',
  'B',
  'BLOCKQUOTE',
  'BR',
  'CODE',
  'EM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'I',
  'LI',
  'OL',
  'P',
  'PRE',
  'S',
  'STRONG',
  'U',
  'UL',
])

const ALLOWED_ATTRIBUTES = new Set(['class', 'title'])

function isSafeUrl(value: string): boolean {
  if ((value.startsWith('/') && !value.startsWith('//')) || value.startsWith('#')) return true
  try {
    const protocol = new URL(value, 'https://suar.invalid').protocol
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

function sanitizeElement(element: Element): void {
  if (!ALLOWED_ELEMENTS.has(element.tagName)) {
    if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE' || element.tagName === 'TEMPLATE') {
      element.remove()
      return
    }
    const parent = element.parentNode
    if (!parent) return
    while (element.firstChild) parent.insertBefore(element.firstChild, element)
    element.remove()
    return
  }

  for (const attribute of [...element.attributes]) {
    const name = attribute.name.toLowerCase()
    if (name.startsWith('on') || !ALLOWED_ATTRIBUTES.has(name)) {
      element.removeAttribute(attribute.name)
      continue
    }
  }

  if (element.tagName === 'A') {
    const href = element.getAttribute('href')
    if (href && isSafeUrl(href)) {
      element.setAttribute('href', href)
      element.setAttribute('rel', 'noopener noreferrer')
    } else {
      element.removeAttribute('href')
    }
  }
}

/**
 * Converts stored rich content to a small, explicitly allow-listed HTML subset.
 * This is intentionally a presentation boundary; the stored value remains unchanged.
 */
export function sanitizeRichContent(value: TvaJsonValue): string {
  const source = typeof value === 'string' ? value : JSON.stringify(value)
  if (typeof DOMParser === 'undefined') return ''

  const document = new DOMParser().parseFromString(source, 'text/html')
  for (const element of [...document.body.querySelectorAll('*')].reverse()) {
    sanitizeElement(element)
  }
  return document.body.innerHTML
}
