import { test } from '@japa/runner'
import {
  generateSlug,
  truncate,
  capitalize,
  titleCase,
  camelToSnake,
  snakeToCamel,
  snakeToPascal,
  stripHtml,
  escapeHtml,
  maskEmail,
  maskPhone,
  normalizeWhitespace,
  isValidEmail,
  isValidPhone,
  randomString,
  formatNumber,
  formatCurrency,
  pluralize,
} from '#libs/string_utils'

// ============================================================================
// generateSlug
// ============================================================================
test.group('generateSlug', () => {
  test('converts simple text to slug', ({ assert }) => {
    assert.equal(generateSlug('Hello World'), 'hello-world')
  })

  test('handles Vietnamese characters with diacritics', ({ assert }) => {
    assert.equal(generateSlug('Xin chào thế giới'), 'xin-chao-the-gioi')
  })

  test('handles Vietnamese đ/Đ characters', ({ assert }) => {
    assert.equal(generateSlug('Đường đi'), 'duong-di')
  })

  test('removes special characters', ({ assert }) => {
    assert.equal(generateSlug('Hello! @World# $2024'), 'hello-world-2024')
  })

  test('collapses multiple hyphens', ({ assert }) => {
    assert.equal(generateSlug('Hello---World'), 'hello-world')
  })

  test('removes leading and trailing hyphens', ({ assert }) => {
    assert.equal(generateSlug('--hello world--'), 'hello-world')
  })

  test('handles uppercase text', ({ assert }) => {
    assert.equal(generateSlug('HELLO WORLD'), 'hello-world')
  })

  test('handles empty string', ({ assert }) => {
    assert.equal(generateSlug(''), '')
  })

  test('handles numbers', ({ assert }) => {
    assert.equal(generateSlug('Task 123'), 'task-123')
  })

  test('handles mixed spaces and special chars', ({ assert }) => {
    assert.equal(generateSlug('  Hello   World!!!  '), 'hello-world')
  })
})

// ============================================================================
// truncate
// ============================================================================
test.group('truncate', () => {
  test('returns original string if shorter than limit', ({ assert }) => {
    assert.equal(truncate('Hello', 10), 'Hello')
  })

  test('truncates long string with default suffix', ({ assert }) => {
    assert.equal(truncate('Hello World Test', 10), 'Hello W...')
  })

  test('truncates with custom suffix', ({ assert }) => {
    assert.equal(truncate('Hello World', 8, '…'), 'Hello W…')
  })

  test('handles exact length', ({ assert }) => {
    assert.equal(truncate('Hello', 5), 'Hello')
  })

  test('handles empty string', ({ assert }) => {
    assert.equal(truncate('', 5), '')
  })
})

// ============================================================================
// capitalize
// ============================================================================
test.group('capitalize', () => {
  test('capitalizes first letter', ({ assert }) => {
    assert.equal(capitalize('hello'), 'Hello')
  })

  test('returns empty string for empty input', ({ assert }) => {
    assert.equal(capitalize(''), '')
  })

  test('keeps rest of string unchanged', ({ assert }) => {
    assert.equal(capitalize('hELLO'), 'HELLO')
  })

  test('handles single character', ({ assert }) => {
    assert.equal(capitalize('a'), 'A')
  })
})

// ============================================================================
// titleCase
// ============================================================================
test.group('titleCase', () => {
  test('capitalizes each word', ({ assert }) => {
    assert.equal(titleCase('hello world'), 'Hello World')
  })

  test('converts uppercase to title case', ({ assert }) => {
    assert.equal(titleCase('HELLO WORLD'), 'Hello World')
  })

  test('handles single word', ({ assert }) => {
    assert.equal(titleCase('hello'), 'Hello')
  })

  test('handles multiple spaces between words', ({ assert }) => {
    // titleCase splits on spaces, so extra spaces result in empty strings -> capitalize('')=''
    const result = titleCase('hello  world')
    assert.equal(result, 'Hello  World')
  })
})

// ============================================================================
// camelToSnake
// ============================================================================
test.group('camelToSnake', () => {
  test('converts camelCase to snake_case', ({ assert }) => {
    assert.equal(camelToSnake('helloWorld'), 'hello_world')
  })

  test('handles multiple uppercase letters', ({ assert }) => {
    assert.equal(camelToSnake('myHTTPClient'), 'my_h_t_t_p_client')
  })

  test('handles single word', ({ assert }) => {
    assert.equal(camelToSnake('hello'), 'hello')
  })

  test('handles already snake_case', ({ assert }) => {
    assert.equal(camelToSnake('hello_world'), 'hello_world')
  })
})

// ============================================================================
// snakeToCamel
// ============================================================================
test.group('snakeToCamel', () => {
  test('converts snake_case to camelCase', ({ assert }) => {
    assert.equal(snakeToCamel('hello_world'), 'helloWorld')
  })

  test('handles multiple underscores', ({ assert }) => {
    assert.equal(snakeToCamel('my_http_client'), 'myHttpClient')
  })

  test('handles single word', ({ assert }) => {
    assert.equal(snakeToCamel('hello'), 'hello')
  })
})

// ============================================================================
// snakeToPascal
// ============================================================================
test.group('snakeToPascal', () => {
  test('converts snake_case to PascalCase', ({ assert }) => {
    assert.equal(snakeToPascal('hello_world'), 'HelloWorld')
  })

  test('handles single word', ({ assert }) => {
    assert.equal(snakeToPascal('hello'), 'Hello')
  })
})

// ============================================================================
// stripHtml
// ============================================================================
test.group('stripHtml', () => {
  test('removes HTML tags', ({ assert }) => {
    assert.equal(stripHtml('<p>Hello <b>World</b></p>'), 'Hello World')
  })

  test('handles self-closing tags', ({ assert }) => {
    assert.equal(stripHtml('Hello<br/>World'), 'HelloWorld')
  })

  test('handles no tags', ({ assert }) => {
    assert.equal(stripHtml('Hello World'), 'Hello World')
  })

  test('handles nested tags', ({ assert }) => {
    assert.equal(stripHtml('<div><span>Test</span></div>'), 'Test')
  })
})

// ============================================================================
// escapeHtml
// ============================================================================
test.group('escapeHtml', () => {
  test('escapes ampersand', ({ assert }) => {
    assert.equal(escapeHtml('A & B'), 'A &amp; B')
  })

  test('escapes angle brackets', ({ assert }) => {
    assert.equal(escapeHtml('<script>'), '&lt;script&gt;')
  })

  test('escapes quotes', ({ assert }) => {
    assert.equal(escapeHtml('"hello"'), '&quot;hello&quot;')
  })

  test('escapes single quotes', ({ assert }) => {
    assert.equal(escapeHtml("it's"), 'it&#39;s')
  })

  test('handles undefined input', ({ assert }) => {
    assert.equal(escapeHtml(undefined), '')
  })

  test('handles empty string', ({ assert }) => {
    assert.equal(escapeHtml(''), '')
  })

  test('escapes all special characters together', ({ assert }) => {
    assert.equal(escapeHtml('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;')
  })
})

// ============================================================================
// maskEmail
// ============================================================================
test.group('maskEmail', () => {
  test('masks email local part', ({ assert }) => {
    assert.equal(maskEmail('john.doe@example.com'), 'j******e@example.com')
  })

  test('masks short local part', ({ assert }) => {
    assert.equal(maskEmail('ab@example.com'), '**@example.com')
  })

  test('handles single char local', ({ assert }) => {
    assert.equal(maskEmail('a@example.com'), '*@example.com')
  })

  test('returns original for invalid email (no @)', ({ assert }) => {
    assert.equal(maskEmail('notanemail'), 'notanemail')
  })
})

// ============================================================================
// maskPhone
// ============================================================================
test.group('maskPhone', () => {
  test('masks middle of phone number', ({ assert }) => {
    assert.equal(maskPhone('0912345678'), '09******78')
  })

  test('masks short phone', ({ assert }) => {
    assert.equal(maskPhone('1234'), '****')
  })

  test('handles very short number', ({ assert }) => {
    assert.equal(maskPhone('12'), '**')
  })
})

// ============================================================================
// normalizeWhitespace
// ============================================================================
test.group('normalizeWhitespace', () => {
  test('collapses multiple spaces', ({ assert }) => {
    assert.equal(normalizeWhitespace('hello   world'), 'hello world')
  })

  test('trims leading and trailing spaces', ({ assert }) => {
    assert.equal(normalizeWhitespace('  hello world  '), 'hello world')
  })

  test('handles tabs and newlines', ({ assert }) => {
    assert.equal(normalizeWhitespace('hello\t\nworld'), 'hello world')
  })
})

// ============================================================================
// isValidEmail
// ============================================================================
test.group('isValidEmail', () => {
  test('accepts valid email', ({ assert }) => {
    assert.isTrue(isValidEmail('user@example.com'))
  })

  test('accepts email with subdomain', ({ assert }) => {
    assert.isTrue(isValidEmail('user@sub.example.com'))
  })

  test('rejects email without @', ({ assert }) => {
    assert.isFalse(isValidEmail('userexample.com'))
  })

  test('rejects email without domain', ({ assert }) => {
    assert.isFalse(isValidEmail('user@'))
  })

  test('rejects email with spaces', ({ assert }) => {
    assert.isFalse(isValidEmail('user @example.com'))
  })

  test('rejects empty string', ({ assert }) => {
    assert.isFalse(isValidEmail(''))
  })
})

// ============================================================================
// isValidPhone
// ============================================================================
test.group('isValidPhone', () => {
  test('accepts valid Vietnamese phone with 0 prefix', ({ assert }) => {
    assert.isTrue(isValidPhone('0912345678'))
  })

  test('accepts valid Vietnamese phone with +84 prefix', ({ assert }) => {
    assert.isTrue(isValidPhone('+84912345678'))
  })

  test('accepts phone with spaces (normalized)', ({ assert }) => {
    assert.isTrue(isValidPhone('091 234 5678'))
  })

  test('rejects too short phone', ({ assert }) => {
    assert.isFalse(isValidPhone('091234'))
  })

  test('rejects invalid prefix', ({ assert }) => {
    assert.isFalse(isValidPhone('0112345678'))
  })

  test('rejects non-numeric phone', ({ assert }) => {
    assert.isFalse(isValidPhone('abc123'))
  })
})

// ============================================================================
// randomString
// ============================================================================
test.group('randomString', () => {
  test('generates string of correct length', ({ assert }) => {
    assert.equal(randomString(10).length, 10)
  })

  test('generates alphanumeric by default', ({ assert }) => {
    const result = randomString(100)
    assert.match(result, /^[a-zA-Z0-9]+$/)
  })

  test('generates numeric only', ({ assert }) => {
    const result = randomString(20, 'numeric')
    assert.match(result, /^[0-9]+$/)
  })

  test('generates alpha only', ({ assert }) => {
    const result = randomString(20, 'alpha')
    assert.match(result, /^[a-zA-Z]+$/)
  })

  test('generates hex only', ({ assert }) => {
    const result = randomString(20, 'hex')
    assert.match(result, /^[0-9a-f]+$/)
  })

  test('handles zero length', ({ assert }) => {
    assert.equal(randomString(0), '')
  })
})

// ============================================================================
// formatNumber
// ============================================================================
test.group('formatNumber', () => {
  test('formats number with Vietnamese locale', ({ assert }) => {
    const result = formatNumber(1234567)
    assert.isTrue(result.includes('1') && result.includes('234') && result.includes('567'))
  })

  test('handles zero', ({ assert }) => {
    assert.equal(formatNumber(0), '0')
  })

  test('handles negative numbers', ({ assert }) => {
    const result = formatNumber(-1234)
    assert.include(result, '1')
    assert.include(result, '234')
  })
})

// ============================================================================
// formatCurrency
// ============================================================================
test.group('formatCurrency', () => {
  test('formats VND currency', ({ assert }) => {
    const result = formatCurrency(1000000)
    assert.isTrue(result.length > 0)
  })

  test('handles zero amount', ({ assert }) => {
    const result = formatCurrency(0)
    assert.isTrue(result.includes('0'))
  })
})

// ============================================================================
// pluralize
// ============================================================================
test.group('pluralize', () => {
  test('returns singular for count 1', ({ assert }) => {
    assert.equal(pluralize(1, 'item'), 'item')
  })

  test('returns plural with s suffix for count > 1', ({ assert }) => {
    assert.equal(pluralize(2, 'item'), 'items')
  })

  test('returns custom plural', ({ assert }) => {
    assert.equal(pluralize(0, 'child', 'children'), 'children')
  })

  test('returns plural for count 0', ({ assert }) => {
    assert.equal(pluralize(0, 'item'), 'items')
  })
})
