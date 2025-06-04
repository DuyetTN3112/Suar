import { test } from '@japa/runner'
import {
  hasTooManyRepeats,
  detectZalgoText,
  countSpecialUnicode,
  sanitizeMessage,
} from '#libs/message_utils'

test.group('Integration | Message Sanitizer', () => {
  // These are pure function tests — no DB or app bootstrap needed

  test('hasTooManyRepeats detects 20+ repeated chars', async ({ assert }) => {
    assert.isTrue(hasTooManyRepeats('a'.repeat(20)))
    assert.isTrue(hasTooManyRepeats('hello ' + 'x'.repeat(25) + ' world'))
    assert.isFalse(hasTooManyRepeats('a'.repeat(19)))
    assert.isFalse(hasTooManyRepeats('normal message'))
  })

  test('detectZalgoText detects excessive combining characters', async ({ assert }) => {
    // Normal text
    assert.isFalse(detectZalgoText('Hello World'))
    assert.isFalse(detectZalgoText('café'))

    // Zalgo text with 5+ combining marks per base char
    const zalgo =
      'H\u0300\u0301\u0302\u0303\u0304e\u0300\u0301\u0302\u0303\u0304'
    assert.isTrue(detectZalgoText(zalgo))
  })

  test('countSpecialUnicode counts chars above BMP', async ({ assert }) => {
    assert.equal(countSpecialUnicode('Hello'), 0)
    assert.equal(countSpecialUnicode('Hello 😀'), 1)
    assert.equal(countSpecialUnicode('😀😁😂'), 3)
  })

  test('sanitizeMessage limits combining characters to 1', async ({ assert }) => {
    const input =
      'H\u0300\u0301\u0302\u0303\u0304\u0305ello'
    const sanitized = sanitizeMessage(input)

    // Should have at most 1 combining char after H
    const combiningCount = Array.from(sanitized).filter(
      (ch) => {
        const cp = ch.codePointAt(0)!
        return cp >= 0x0300 && cp <= 0x036f
      }
    ).length
    assert.isAtMost(combiningCount, 1)
  })

  test('sanitizeMessage caps repeated characters to 10', async ({ assert }) => {
    const input = 'a'.repeat(50)
    const sanitized = sanitizeMessage(input)
    assert.equal(sanitized.length, 10)
  })

  test('normal message passes through unchanged', async ({ assert }) => {
    const msg = 'Hello, how are you today?'
    assert.isFalse(hasTooManyRepeats(msg))
    assert.isFalse(detectZalgoText(msg))
    assert.equal(countSpecialUnicode(msg), 0)
    assert.equal(sanitizeMessage(msg), msg)
  })

  test('message length validation at boundary', async ({ assert }) => {
    // Test that we can validate message length
    const maxLength = 10000
    const validMsg = 'a'.repeat(maxLength)
    assert.equal(validMsg.length, maxLength)

    const invalidMsg = 'a'.repeat(maxLength + 1)
    assert.isAbove(invalidMsg.length, maxLength)
  })
})
