import type { FilterExpression, FilterPreference } from '../contracts'

export type ExpressionPath = readonly number[]
export type ExpressionMove = 'up' | 'down' | 'indent' | 'outdent'

export interface ExpressionBuilderDiagnostic {
  code: 'EMPTY_GROUP' | 'GROUP_CHILDREN_LIMIT' | 'MAX_DEPTH' | 'MAX_CONDITIONS'
  path: ExpressionPath
  message: string
}

export interface ExpressionBuilderState {
  readonly expression: FilterExpression
  readonly preferences: readonly FilterPreference[]
  readonly undoStack: readonly ExpressionSnapshot[]
  readonly redoStack: readonly ExpressionSnapshot[]
}

interface ExpressionSnapshot {
  readonly expression: FilterExpression
  readonly preferences: readonly FilterPreference[]
}

export interface ExpressionBuilderLimits {
  readonly maxDepth: number
  readonly maxConditions: number
}

function snapshot(state: ExpressionBuilderState): ExpressionSnapshot {
  return { expression: cloneSerializable(state.expression), preferences: cloneSerializable(state.preferences) }
}

function cloneSerializable<T>(value: T): T {
  // Svelte rune proxies are not structured-cloneable; Filter ASTs are bounded JSON values.
  return JSON.parse(JSON.stringify(value)) as T
}

function commit(state: ExpressionBuilderState, expression: FilterExpression): ExpressionBuilderState {
  return {
    expression,
    preferences: state.preferences,
    undoStack: [...state.undoStack, snapshot(state)],
    redoStack: [],
  }
}

export function createExpressionBuilderState(
  expression: FilterExpression,
  preferences: readonly FilterPreference[] = []
): ExpressionBuilderState {
  return { expression, preferences, undoStack: [], redoStack: [] }
}

function expressionAt(root: FilterExpression, path: ExpressionPath): FilterExpression | undefined {
  let current = root
  for (const index of path) {
    if (current.kind !== 'group') return undefined
    const child: FilterExpression | undefined = current.children[index]
    if (child === undefined) return undefined
    current = child
  }
  return current
}

function replaceAt(root: FilterExpression, path: ExpressionPath, replacement: FilterExpression): FilterExpression {
  if (path.length === 0) return replacement
  if (root.kind !== 'group') return root
  const [head, ...tail] = path
  return {
    ...root,
    children: root.children.map((child, index) =>
      index === head ? replaceAt(child, tail, replacement) : child
    ),
  }
}

export function setExpressionAt(
  state: ExpressionBuilderState,
  path: ExpressionPath,
  expression: FilterExpression
): ExpressionBuilderState {
  if (!expressionAt(state.expression, path)) return state
  return commit(state, replaceAt(state.expression, path, expression))
}

function parentPath(path: ExpressionPath): number[] {
  return path.slice(0, -1)
}

export function addExpressionChild(
  state: ExpressionBuilderState,
  path: ExpressionPath,
  child: FilterExpression
): ExpressionBuilderState {
  const target = expressionAt(state.expression, path)
  if (!target) return state
  const group =
    target.kind === 'group'
      ? target
      : { kind: 'group' as const, combinator: 'and' as const, children: [target] }
  const next: FilterExpression = {
    ...group,
    children: [...group.children, child],
  }
  return commit(state, replaceAt(state.expression, path, next))
}

export function removeExpressionAt(
  state: ExpressionBuilderState,
  path: ExpressionPath
): ExpressionBuilderState {
  if (path.length === 0) return state
  const parent = expressionAt(state.expression, parentPath(path))
  const index = path[path.length - 1]
  if (!parent || parent.kind !== 'group' || index === undefined || !parent.children[index]) return state
  const nextParent: FilterExpression = {
    ...parent,
    children: parent.children.filter((_child, childIndex) => childIndex !== index),
  }
  return commit(state, replaceAt(state.expression, parentPath(path), nextParent))
}

export function moveExpressionChild(
  state: ExpressionBuilderState,
  path: ExpressionPath,
  movement: ExpressionMove
): ExpressionBuilderState {
  if (path.length === 0) return state
  const parent = expressionAt(state.expression, parentPath(path))
  const index = path[path.length - 1]
  if (!parent || parent.kind !== 'group' || index === undefined) return state

  if (movement === 'up' || movement === 'down') {
    const targetIndex = movement === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= parent.children.length) return state
    const children = [...parent.children]
    const current = children[index]
    const target = children[targetIndex]
    if (!current || !target) return state
    children[index] = target
    children[targetIndex] = current
    return commit(state, replaceAt(state.expression, parentPath(path), { ...parent, children }))
  }

  if (movement === 'indent') {
    const previous = parent.children[index - 1]
    const current = parent.children[index]
    if (!previous || !current || previous.kind !== 'group') return state
    const withoutCurrent = parent.children.filter((_child, childIndex) => childIndex !== index)
    const indented = { ...previous, children: [...previous.children, current] }
    const previousIndex = index - 1
    const children = withoutCurrent.map((child, childIndex) =>
      childIndex === previousIndex ? indented : child
    )
    return commit(state, replaceAt(state.expression, parentPath(path), { ...parent, children }))
  }

  const grandparentPath = parentPath(parentPath(path))
  const grandparent = expressionAt(state.expression, grandparentPath)
  if (!grandparent || grandparent.kind !== 'group') return state
  const current = parent.children[index]
  if (!current) return state
  const withoutCurrent = parent.children.filter((_child, childIndex) => childIndex !== index)
  const updatedParent = { ...parent, children: withoutCurrent }
  const parentIndex = parentPath(path)[parentPath(path).length - 1]
  if (parentIndex === undefined) return state
  const siblings = [...grandparent.children]
  siblings.splice(parentIndex, 1, updatedParent, current)
  return commit(state, replaceAt(state.expression, grandparentPath, { ...grandparent, children: siblings }))
}

export function undoExpressionBuilder(state: ExpressionBuilderState): ExpressionBuilderState {
  const previous = state.undoStack[state.undoStack.length - 1]
  if (!previous) return state
  return {
    ...state,
    expression: previous.expression,
    preferences: previous.preferences,
    undoStack: state.undoStack.slice(0, -1),
    redoStack: [...state.redoStack, snapshot(state)],
  }
}

export function redoExpressionBuilder(state: ExpressionBuilderState): ExpressionBuilderState {
  const next = state.redoStack[state.redoStack.length - 1]
  if (!next) return state
  return {
    ...state,
    expression: next.expression,
    preferences: next.preferences,
    undoStack: [...state.undoStack, snapshot(state)],
    redoStack: state.redoStack.slice(0, -1),
  }
}

export function validateExpressionBuilderState(
  state: ExpressionBuilderState,
  limits: ExpressionBuilderLimits
): ExpressionBuilderDiagnostic[] {
  const diagnostics: ExpressionBuilderDiagnostic[] = []
  let conditions = 0
  function visit(expression: FilterExpression, path: number[], depth: number): void {
    if (depth > limits.maxDepth) {
      diagnostics.push({ code: 'MAX_DEPTH', path, message: `Reduce nesting to at most ${limits.maxDepth} levels.` })
    }
    if (expression.kind === 'condition') {
      conditions += 1
      return
    }
    if (expression.children.length === 0) {
      diagnostics.push({ code: 'EMPTY_GROUP', path, message: 'Add a condition or remove this group.' })
    }
    if (expression.children.length === 1) {
      diagnostics.push({ code: 'GROUP_CHILDREN_LIMIT', path, message: 'A stored group needs at least two children.' })
    }
    expression.children.forEach((child, index) => visit(child, [...path, index], depth + 1))
  }
  visit(state.expression, [], 0)
  if (conditions > limits.maxConditions) {
    diagnostics.push({ code: 'MAX_CONDITIONS', path: [], message: `Reduce to at most ${limits.maxConditions} conditions.` })
  }
  return diagnostics
}
