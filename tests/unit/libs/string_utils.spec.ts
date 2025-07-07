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

test.group('String utils', () => {
  test('slug generation, normalization, and display transforms preserve canonical word shape', ({
    assert,
  }) => {
    const cases = [
      ['Xin chào thế giới', 'xin-chao-the-gioi'],
      ['Đường đi 2024', 'duong-di-2024'],
      ['  Hello   World!!!  ', 'hello-world'],
      ['Hello---World', 'hello-world'],
      ['', ''],
    ] as const

    for (const [input, expected] of cases) {
      assert.equal(generateSlug(input), expected)
    }
    assert.equal(normalizeWhitespace('  hello\t\nworld  '), 'hello world')
    assert.equal(truncate('Hello', 10), 'Hello')
    assert.equal(truncate('Hello World Test', 10), 'Hello W...')
    assert.equal(capitalize('hELLO'), 'HELLO')
    assert.equal(titleCase('hello  world'), 'Hello  World')
    assert.equal(camelToSnake('myHTTPClient'), 'my_h_t_t_p_client')
    assert.equal(snakeToCamel('my_http_client'), 'myHttpClient')
    assert.equal(snakeToPascal('hello_world'), 'HelloWorld')
  })

  test('html, masking, and validation helpers preserve safety and privacy boundaries', ({
    assert,
  }) => {
    assert.equal(stripHtml('<p>Hello <b>World</b></p>'), 'Hello World')
    assert.equal(escapeHtml('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;')
    assert.equal(escapeHtml(undefined), '')
    assert.equal(maskEmail('john.doe@example.com'), 'j******e@example.com')
    assert.equal(maskEmail('a@example.com'), '*@example.com')
    assert.equal(maskPhone('0912345678'), '09******78')
    assert.equal(maskPhone('1234'), '****')
    assert.isTrue(isValidEmail('user@example.com'))
    assert.isFalse(isValidEmail('user @example.com'))
    assert.isTrue(isValidPhone('+84912345678'))
    assert.isFalse(isValidPhone('0112345678'))
  })

  test('random and locale-format helpers respect requested output surfaces', ({ assert }) => {
    const numeric = randomString(20, 'numeric')
    const alpha = randomString(20, 'alpha')
    const hex = randomString(20, 'hex')

    assert.equal(randomString(0), '')
    assert.match(numeric, /^[0-9]+$/)
    assert.match(alpha, /^[a-zA-Z]+$/)
    assert.match(hex, /^[0-9a-f]+$/)
    assert.equal(pluralize(1, 'item'), 'item')
    assert.equal(pluralize(0, 'child', 'children'), 'children')
    assert.include(formatNumber(1234567), '234')
    assert.include(formatCurrency(0), '0')
  })
})
