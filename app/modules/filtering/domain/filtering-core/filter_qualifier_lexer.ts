export type FilterQualifierTokenKind =
  | 'word'
  | 'string'
  | 'colon'
  | 'comparison'
  | 'minus'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'eof'

export interface FilterQualifierToken {
  readonly kind: FilterQualifierTokenKind
  readonly value: string
  readonly start: number
  readonly end: number
  readonly quoted?: boolean
}

export interface FilterQualifierLexDiagnostic {
  readonly code: 'QUALIFIER_UNTERMINATED_QUOTE' | 'QUALIFIER_INVALID_ESCAPE'
  readonly start: number
  readonly end: number
  readonly message: string
  readonly repairHint: string
}

export interface FilterQualifierLexResult {
  readonly tokens: readonly FilterQualifierToken[]
  readonly diagnostics: readonly FilterQualifierLexDiagnostic[]
}

function isWhitespace(character: string | undefined): boolean {
  return character !== undefined && /\s/u.test(character)
}

function isSpecial(character: string | undefined): boolean {
  return (
    character === ':' ||
    character === '(' ||
    character === ')' ||
    character === ',' ||
    character === '>' ||
    character === '<' ||
    character === '"' ||
    character === "'"
  )
}

export function lexFilterQualifiers(input: string): FilterQualifierLexResult {
  const tokens: FilterQualifierToken[] = []
  const diagnostics: FilterQualifierLexDiagnostic[] = []
  let index = 0

  while (index < input.length) {
    if (isWhitespace(input[index])) {
      index += 1
      continue
    }

    const start = index
    const character = input[index]

    if (character === ':') {
      tokens.push({ kind: 'colon', value: character, start, end: ++index })
      continue
    }
    if (character === '(') {
      tokens.push({ kind: 'lparen', value: character, start, end: ++index })
      continue
    }
    if (character === ')') {
      tokens.push({ kind: 'rparen', value: character, start, end: ++index })
      continue
    }
    if (character === ',') {
      tokens.push({ kind: 'comma', value: character, start, end: ++index })
      continue
    }
    if (character === '-' && /\d/u.test(input[index + 1] ?? '')) {
      index += 1
      while (index < input.length && /[\d.]/u.test(input[index] ?? '')) index += 1
      tokens.push({ kind: 'word', value: input.slice(start, index), start, end: index })
      continue
    }
    if (character === '-') {
      tokens.push({ kind: 'minus', value: character, start, end: ++index })
      continue
    }
    if (character === '>' || character === '<') {
      const second = input[index + 1]
      const value = second === '=' ? `${character}=` : character
      index += value.length
      tokens.push({ kind: 'comparison', value, start, end: index })
      continue
    }
    if (character === '"' || character === "'") {
      const quote = character
      index += 1
      let value = ''
      let closed = false
      while (index < input.length) {
        const current = input[index]
        if (current === '\\') {
          const escaped = input[index + 1]
          if (escaped === undefined) break
          if (escaped !== quote && escaped !== '\\') {
            diagnostics.push({
              code: 'QUALIFIER_INVALID_ESCAPE',
              start: index,
              end: index + 2,
              message: 'Only quote and backslash escapes are supported.',
              repairHint: `Escape the ${quote} character or remove the backslash.`,
            })
          }
          value += escaped
          index += 2
          continue
        }
        if (current === quote) {
          index += 1
          closed = true
          break
        }
        value += current
        index += 1
      }
      if (!closed) {
        diagnostics.push({
          code: 'QUALIFIER_UNTERMINATED_QUOTE',
          start,
          end: input.length,
          message: 'Quoted qualifier value is not terminated.',
          repairHint: `Close the phrase with ${quote}.`,
        })
      }
      tokens.push({ kind: 'string', value, start, end: index, quoted: true })
      continue
    }

    while (
      index < input.length &&
      !isWhitespace(input[index]) &&
      !isSpecial(input[index])
    ) {
      index += 1
    }
    if (index === start) {
      index += 1
    }
    tokens.push({ kind: 'word', value: input.slice(start, index), start, end: index })
  }

  tokens.push({ kind: 'eof', value: '', start: input.length, end: input.length })
  return { tokens, diagnostics }
}
