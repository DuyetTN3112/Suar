import type {
  FilterCondition,
  FilterExpression,
  FilterScalar,
  FilterStrictEffect,
} from '#modules/filtering/domain/filtering-core/filter_expression'
import {
  lexFilterQualifiers,
  type FilterQualifierToken,
} from '#modules/filtering/domain/filtering-core/filter_qualifier_lexer'
import type { FilterFieldType } from '#modules/filtering/public_contracts/filter_contracts'

export interface QualifierFieldDefinition {
  readonly type: FilterFieldType
  readonly operators: readonly string[]
  readonly defaultUnknown?: 'include' | 'exclude'
}

export interface QualifierDiagnostic {
  readonly code: string
  readonly start: number
  readonly end: number
  readonly message: string
  readonly repairHint: string
}

export interface FilterQualifierParserOptions {
  readonly allowedFields: Readonly<Record<string, QualifierFieldDefinition>>
  readonly maxLength?: number
  readonly maxDepth?: number
  readonly maxConditions?: number
}

export interface FilterQualifierParseResult {
  expression?: FilterExpression
  readonly residualText: string
  readonly diagnostics: readonly QualifierDiagnostic[]
}

interface ParserState {
  readonly input: string
  readonly tokens: readonly FilterQualifierToken[]
  readonly fields: Readonly<Record<string, QualifierFieldDefinition>>
  readonly maxDepth: number
  readonly maxConditions: number
  index: number
  conditions: number
  diagnostics: QualifierDiagnostic[]
  residual: string[]
}

function diagnostic(
  state: ParserState,
  code: string,
  token: FilterQualifierToken,
  message: string,
  repairHint: string
): void {
  state.diagnostics.push({ code, start: token.start, end: token.end, message, repairHint })
}

function current(state: ParserState): FilterQualifierToken {
  const token = state.tokens[state.index]
  if (token) return token
  const last = state.tokens[state.tokens.length - 1]
  return last ?? { kind: 'eof', value: '', start: state.input.length, end: state.input.length }
}

function advance(state: ParserState): FilterQualifierToken {
  const token = current(state)
  state.index += 1
  return token
}

function isWord(token: FilterQualifierToken | undefined, value?: string): boolean {
  return token?.kind === 'word' && (value === undefined || token.value.toLocaleLowerCase('en-US') === value)
}

function hasQualifierAt(state: ParserState, index = state.index): boolean {
  const first = state.tokens[index]
  const offset = first?.kind === 'minus' ? 1 : 0
  return state.tokens[index + offset]?.kind === 'word' && state.tokens[index + offset + 1]?.kind === 'colon'
}

function parseScalar(raw: string): FilterScalar {
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(raw)) return Number(raw)
  return raw
}

function normalizeDateValue(value: FilterScalar, field: QualifierFieldDefinition, operator: string): FilterScalar {
  if (field.type !== 'date_time' || typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return value
  }
  return operator === 'lte' || operator === 'lt'
    ? `${value}T23:59:59.999Z`
    : `${value}T00:00:00.000Z`
}

function defaultOperator(field: QualifierFieldDefinition, quoted: boolean): string {
  switch (field.type) {
    case 'multi_value':
      return 'contains_any'
    case 'text':
      return quoted ? 'exact' : 'contains'
    case 'hierarchy':
      return 'is'
    case 'number':
    case 'date_time':
    case 'scalar':
    case 'relation':
    case 'boolean':
      return 'eq'
    default:
      return 'eq'
  }
}

function comparisonOperator(value: string): string | undefined {
  return { '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte' }[value]
}

function conditionFor(
  state: ParserState,
  fieldName: string,
  field: QualifierFieldDefinition,
  rawValue: string,
  quoted: boolean,
  explicitOperator: string | undefined,
  effect: FilterStrictEffect,
  token: FilterQualifierToken
): FilterCondition | undefined {
  let operator = explicitOperator ?? defaultOperator(field, quoted)
  let normalizedEffect = effect
  if (normalizedEffect === 'exclude' && operator === 'contains_any') {
    operator = 'contains_none'
    normalizedEffect = 'require'
  }
  const complementAllowed = operator === 'contains_none' && field.operators.includes('contains_any')
  if (!field.operators.includes(operator) && !complementAllowed) {
    diagnostic(
      state,
      'QUALIFIER_UNSUPPORTED_OPERATOR',
      token,
      `Operator ${operator} is not allowed for ${fieldName}.`,
      'Choose an operator offered by this filter context.'
    )
    return undefined
  }

  state.conditions += 1
  if (state.conditions > state.maxConditions) {
    diagnostic(
      state,
      'QUALIFIER_CONDITION_LIMIT_EXCEEDED',
      token,
      'The qualifier expression contains too many conditions.',
      `Reduce the expression to at most ${state.maxConditions} conditions.`
    )
    return undefined
  }

  const scalar = normalizeDateValue(parseScalar(rawValue), field, operator)
  const value =
    field.type === 'multi_value'
      ? { kind: 'set' as const, values: [scalar] }
      : { kind: 'scalar' as const, value: scalar }
  return {
    kind: 'condition',
    field: fieldName,
    operator: normalizedEffect === 'exclude' && operator === 'contains_none' ? 'contains_any' : operator,
    effect: normalizedEffect,
    unknown: field.defaultUnknown ?? 'exclude',
    value,
  }
}

function consumeUntilGroupEnd(state: ParserState): void {
  let depth = 0
  while (current(state).kind !== 'eof') {
    if (current(state).kind === 'lparen') depth += 1
    if (current(state).kind === 'rparen') {
      if (depth === 0) return
      depth -= 1
    }
    advance(state)
  }
}

function consumeUnknownQualifierValue(state: ParserState): void {
  if (current(state).kind !== 'lparen') {
    if (current(state).kind !== 'eof') advance(state)
    return
  }
  const opening = advance(state)
  let depth = 1
  while (current(state).kind !== 'eof' && depth > 0) {
    if (current(state).kind === 'lparen') depth += 1
    if (current(state).kind === 'rparen') depth -= 1
    advance(state)
  }
  if (depth > 0) {
    diagnostic(state, 'QUALIFIER_UNBALANCED_PAREN', opening, 'Qualifier group is not closed.', 'Add a closing parenthesis.')
  }
}

function parseValueToken(state: ParserState): FilterQualifierToken | undefined {
  const token = current(state)
  if (token.kind !== 'word' && token.kind !== 'string') return undefined
  return advance(state)
}

function parseValueGroup(
  state: ParserState,
  fieldName: string,
  field: QualifierFieldDefinition,
  effect: FilterStrictEffect,
  depth: number
): FilterExpression | undefined {
  const opening = advance(state)
  if (depth > state.maxDepth) {
    diagnostic(state, 'QUALIFIER_DEPTH_EXCEEDED', opening, 'Qualifier nesting is too deep.', 'Reduce nested parentheses.')
    consumeUntilGroupEnd(state)
    return undefined
  }

  const children: FilterExpression[] = []
  let combinator: 'and' | 'or' = 'or'
  while (current(state).kind !== 'eof' && current(state).kind !== 'rparen') {
    if (isWord(current(state), 'or')) {
      combinator = 'or'
      advance(state)
      continue
    }
    if (isWord(current(state), 'and')) {
      combinator = 'and'
      advance(state)
      continue
    }
    const value = parseValueToken(state)
    if (value === undefined) {
      diagnostic(state, 'QUALIFIER_INVALID_TOKEN', current(state), 'Expected a qualifier value.', 'Use a value or close the group.')
      advance(state)
      continue
    }
    const child = conditionFor(state, fieldName, field, value.value, value.quoted === true, undefined, effect, value)
    if (child) children.push(child)
    if (current(state).kind === 'comma') advance(state)
  }

  if (current(state).kind !== 'rparen') {
    diagnostic(state, 'QUALIFIER_UNBALANCED_PAREN', opening, 'Qualifier group is not closed.', 'Add a closing parenthesis.')
  } else {
    advance(state)
  }
  if (children.length === 0) return undefined
  const conditions = children.filter((child): child is FilterCondition => child.kind === 'condition')
  if (field.type === 'multi_value' && conditions.length === children.length) {
    const first = conditions[0]
    const values = conditions.flatMap((child) =>
      child.value?.kind === 'set' ? child.value.values : []
    )
    if (
      first &&
      values.length === conditions.length &&
      conditions.every((child) => child.operator === first.operator && child.effect === first.effect)
    ) {
      state.conditions -= Math.max(0, conditions.length - 1)
      return {
        ...first,
        operator: combinator === 'and' ? 'contains_all' : first.operator,
        value: { kind: 'set', values },
      }
    }
  }
  if (children.length === 1) return children[0]
  return { kind: 'group', combinator, children }
}

function parseQualifier(state: ParserState): FilterExpression | undefined {
  let effect: FilterStrictEffect = 'require'
  if (current(state).kind === 'minus') {
    effect = 'exclude'
    advance(state)
  }
  const fieldToken = advance(state)
  advance(state)
  const fieldName = fieldToken.value
  const field = state.fields[fieldName]
  if (!field) {
    diagnostic(state, 'QUALIFIER_UNKNOWN_FIELD', fieldToken, `Unknown qualifier field ${fieldName}.`, 'Choose a field allowed by this filter context.')
    consumeUnknownQualifierValue(state)
    return undefined
  }

  let explicitOperator: string | undefined
  if (current(state).kind === 'comparison') {
    const comparison = advance(state)
    explicitOperator = comparisonOperator(comparison.value)
  }
  if (current(state).kind === 'lparen') {
    return parseValueGroup(state, fieldName, field, effect, 1)
  }
  const value = parseValueToken(state)
  if (!value) {
    diagnostic(state, 'QUALIFIER_VALUE_MISSING', current(state), `Qualifier ${fieldName} has no value.`, 'Add a value after the colon.')
    return undefined
  }
  return conditionFor(state, fieldName, field, value.value, value.quoted === true, explicitOperator, effect, value)
}

function residualValue(state: ParserState, token: FilterQualifierToken): void {
  const raw = state.input.slice(token.start, token.end)
  state.residual.push(token.quoted ? token.value : raw)
}

export function parseFilterQualifiers(
  input: string,
  options: FilterQualifierParserOptions
): FilterQualifierParseResult {
  const maxLength = options.maxLength ?? 512
  if (input.length > maxLength) {
    return {
      residualText: '',
      diagnostics: [
        {
          code: 'QUALIFIER_INPUT_TOO_LONG',
          start: maxLength,
          end: input.length,
          message: 'Qualifier input exceeds the context limit.',
          repairHint: `Shorten the input to at most ${maxLength} characters.`,
        },
      ],
    }
  }

  const lexed = lexFilterQualifiers(input)
  const state: ParserState = {
    input,
    tokens: lexed.tokens,
    fields: options.allowedFields,
    maxDepth: options.maxDepth ?? 5,
    maxConditions: options.maxConditions ?? 100,
    index: 0,
    conditions: 0,
    diagnostics: lexed.diagnostics.map((item) => ({ ...item })),
    residual: [],
  }

  const expressions: FilterExpression[] = []
  while (current(state).kind !== 'eof') {
    if (hasQualifierAt(state)) {
      const expression = parseQualifier(state)
      if (expression) expressions.push(expression)
      continue
    }
    const token = advance(state)
    if (token.kind === 'rparen') {
      diagnostic(state, 'QUALIFIER_UNBALANCED_PAREN', token, 'Unexpected closing parenthesis.', 'Remove the closing parenthesis or add its opening pair.')
      continue
    }
    if (token.kind === 'minus' && hasQualifierAt(state)) {
      state.index -= 1
      const expression = parseQualifier(state)
      if (expression) expressions.push(expression)
      continue
    }
    if (token.kind !== 'eof') residualValue(state, token)
  }

  const expression =
    expressions.length === 0
      ? undefined
      : expressions.length === 1
        ? expressions[0]
        : { kind: 'group' as const, combinator: 'and' as const, children: expressions }

  const result: FilterQualifierParseResult = {
    residualText: state.diagnostics.length === 0 ? state.residual.join(' ').trim() : '',
    diagnostics: state.diagnostics,
  }
  if (state.diagnostics.length === 0 && expression !== undefined) {
    result.expression = expression
  }
  return result
}
