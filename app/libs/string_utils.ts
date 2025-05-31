/**
 * String Utilities
 *
 * Helpers for string operations.
 * Pattern học từ ancarat-bo: utils.ts
 *
 * @module StringUtils
 */

/**
 * Generate a slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[đĐ]/g, 'd') // Handle Vietnamese đ
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/-+/g, '-') // Replace multiple - with single -
    .replace(/^-|-$/g, '') // Remove leading/trailing -
}

/**
 * Truncate a string to a specified length
 */
export function truncate(text: string, length: number, suffix = '...'): string {
  if (text.length <= length) return text
  return text.substring(0, length - suffix.length) + suffix
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(text: string): string {
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ')
}

/**
 * Convert camelCase to snake_case
 */
export function camelToSnake(text: string): string {
  return text.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(text: string): string {
  return text.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

/**
 * Convert snake_case to PascalCase
 */
export function snakeToPascal(text: string): string {
  return capitalize(snakeToCamel(text))
}

/**
 * Remove HTML tags from a string
 */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '')
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text?: string): string {
  if (!text) return ''

  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }

  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] ?? char)
}

/**
 * Mask sensitive data (e.g., email, phone)
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email

  const maskedLocal =
    local.length <= 2
      ? '*'.repeat(local.length)
      : `${local.charAt(0)}${'*'.repeat(local.length - 2)}${local.charAt(local.length - 1)}`

  return `${maskedLocal}@${domain}`
}

/**
 * Mask phone number
 */
export function maskPhone(phone: string): string {
  if (phone.length <= 4) return '*'.repeat(phone.length)
  return phone.slice(0, 2) + '*'.repeat(phone.length - 4) + phone.slice(-2)
}

/**
 * Trim and normalize whitespace
 */
export function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

/**
 * Check if string is a valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check if string is a valid phone number (Vietnamese format)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

/**
 * Generate a random string
 */
export function randomString(length: number, charset = 'alphanumeric'): string {
  const charsets: Record<string, string> = {
    numeric: '0123456789',
    alpha: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    alphanumeric: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    hex: '0123456789abcdef',
  }

  const chars = charsets[charset] || charset
  let result = ''

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return result
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number, locale = 'vi-VN'): string {
  return new Intl.NumberFormat(locale).format(num)
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency = 'VND', locale = 'vi-VN'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Pluralize a word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular
  return plural || `${singular}s`
}
