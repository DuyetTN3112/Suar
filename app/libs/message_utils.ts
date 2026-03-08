/**
 * Message Utilities — Pure functions for message validation and sanitization.
 *
 * Extracted from app/middleware/message_sanitizer.ts.
 * All functions are synchronous, pure, and have 0 framework dependencies.
 *
 * @module MessageUtils
 */

/**
 * Detect if a string has 20+ consecutive repeated characters.
 */
export function hasTooManyRepeats(str: string): boolean {
  return /(.)\1{19,}/u.test(str)
}

/**
 * Detect Zalgo text (excessive combining characters stacked on base characters).
 * Returns true if any base character has 5+ combining diacritical marks.
 */
export function detectZalgoText(str: string): boolean {
  const combiningCharPattern =
    /(.[\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]{5,})/gu
  return combiningCharPattern.test(str)
}

/**
 * Count Unicode characters outside the Basic Multilingual Plane (code point > 0xFFFF).
 */
export function countSpecialUnicode(str: string): number {
  return Array.from(str).filter((ch) => {
    const codePoint = ch.codePointAt(0)
    return codePoint !== undefined && codePoint > 0xffff
  }).length
}

/**
 * Sanitize Zalgo text by:
 * 1. Removing known Zalgo attack characters (꙰, modifier letter voicing, combining enclosing diamond)
 * 2. Limiting combining characters to max 1 per base character
 * 3. Capping consecutive repeated characters to max 10
 */
export function sanitizeMessage(str: string): string {
  // Remove specific attack characters
  str = str.replace(/[꙰\u02EC\u20DD]/g, '')
  // Limit combining characters to 1 per base character
  str = str.replace(
    /(.)([\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]{1,})/gu,
    (_match: string, base: string, combining: string) => base + combining.substring(0, 1)
  )
  // Cap repeated characters to 10
  str = str.replace(/(.)(\1{10,})/g, (_match: string, char: string) => char.repeat(10))

  return str
}
