#!/usr/bin/env node
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

/**
 * @typedef {{ name: string, regex: RegExp }} SideEffectPattern
 * @typedef {{ start: number, end: number, marker?: string }} SourceRange
 * @typedef {{ filePath: string, line: number, col: number, name: string, snippet: string }} Violation
 */

/** @type {SideEffectPattern[]} */
const SIDE_EFFECT_PATTERNS = [
  {
    name: 'emitter.emit',
    regex: /\b(?:void\s+|await\s+)?emitter\s*\.\s*emit\s*\(/g,
  },
  {
    name: 'CacheService.deleteByPattern',
    regex: /\bCacheService\s*\.\s*deleteByPattern\s*\(/g,
  },
  {
    name: 'createNotification.handle',
    regex: /\bcreateNotification\s*\.\s*handle\s*\(/g,
  },
]

/** @type {RegExp[]} */
const CALLBACK_MARKERS = [
  /\bexecuteInTransaction\s*\(/g,
  /\bdb\s*\.\s*transaction\s*\(\s*async\b/g,
]

/**
 * @returns {string[]}
 */
function listCommandFiles() {
  const out = /** @type {string} */ (
    execSync('rg --files app/actions -g "**/commands/*.ts"', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  )

  return out
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * @param {string} source
 * @param {number} index
 * @returns {{ line: number, col: number }}
 */
function findLineCol(source, index) {
  let line = 1
  let col = 1

  for (let i = 0; i < index; i += 1) {
    if (source.charAt(i) === '\n') {
      line += 1
      col = 1
    } else {
      col += 1
    }
  }

  return { line, col }
}

/**
 * @param {string} source
 * @param {number} i
 * @returns {number}
 */
function skipStringOrComment(source, i) {
  const ch = source.charAt(i)
  const next = source.charAt(i + 1)

  if (ch === '"' || ch === "'" || ch === '`') {
    const quote = ch
    let j = i + 1
    while (j < source.length) {
      if (source.charAt(j) === '\\') {
        j += 2
        continue
      }
      if (source.charAt(j) === quote) {
        return j + 1
      }
      j += 1
    }
    return source.length
  }

  if (ch === '/' && next === '/') {
    let j = i + 2
    while (j < source.length && source.charAt(j) !== '\n') {
      j += 1
    }
    return j
  }

  if (ch === '/' && next === '*') {
    let j = i + 2
    while (j + 1 < source.length) {
      if (source.charAt(j) === '*' && source.charAt(j + 1) === '/') {
        return j + 2
      }
      j += 1
    }
    return source.length
  }

  return i
}

/**
 * @param {string} source
 * @param {number} start
 * @returns {number}
 */
function findNextBrace(source, start) {
  let i = start
  while (i < source.length) {
    const skipTo = skipStringOrComment(source, i)
    if (skipTo !== i) {
      i = skipTo
      continue
    }

    if (source.charAt(i) === '{') {
      return i
    }

    i += 1
  }

  return -1
}

/**
 * @param {string} source
 * @param {number} openIndex
 * @returns {number}
 */
function findMatchingBrace(source, openIndex) {
  let depth = 0
  let i = openIndex

  while (i < source.length) {
    const skipTo = skipStringOrComment(source, i)
    if (skipTo !== i) {
      i = skipTo
      continue
    }

    if (source.charAt(i) === '{') {
      depth += 1
    } else if (source.charAt(i) === '}') {
      depth -= 1
      if (depth === 0) {
        return i
      }
    }

    i += 1
  }

  return -1
}

/**
 * @param {string} source
 * @returns {SourceRange[]}
 */
function findTransactionCallbackRanges(source) {
  /** @type {SourceRange[]} */
  const ranges = []

  for (const marker of CALLBACK_MARKERS) {
    marker.lastIndex = 0
    let match = marker.exec(source)
    while (match) {
      const markerStart = match.index
      const searchFrom = markerStart + match[0].length
      const openBrace = findNextBrace(source, searchFrom)

      if (openBrace !== -1) {
        const closeBrace = findMatchingBrace(source, openBrace)
        if (closeBrace !== -1) {
          ranges.push({
            start: openBrace,
            end: closeBrace,
            marker: match[0],
          })
        }
      }

      match = marker.exec(source)
    }
  }

  return ranges.sort((a, b) => a.start - b.start)
}

/**
 * @param {string} source
 * @returns {SourceRange[]}
 */
function findCommitCallbackRanges(source) {
  /** @type {SourceRange[]} */
  const ranges = []
  const commitMarker = /\btrx\s*\.\s*on\s*\(\s*['"]commit['"]\s*,/g

  commitMarker.lastIndex = 0
  let match = commitMarker.exec(source)
  while (match) {
    const markerStart = match.index
    const searchFrom = markerStart + match[0].length
    const openBrace = findNextBrace(source, searchFrom)

    if (openBrace !== -1) {
      const closeBrace = findMatchingBrace(source, openBrace)
      if (closeBrace !== -1) {
        ranges.push({ start: openBrace, end: closeBrace })
      }
    }

    match = commitMarker.exec(source)
  }

  return ranges.sort((a, b) => a.start - b.start)
}

/**
 * @param {number} index
 * @param {SourceRange[]} ranges
 * @returns {boolean}
 */
function isInsideAnyRange(index, ranges) {
  return ranges.some((range) => index > range.start && index < range.end)
}

/**
 * @param {string} filePath
 * @returns {Violation[]}
 */
function findViolationsInFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf-8')
  const ranges = findTransactionCallbackRanges(source)
  const commitRanges = findCommitCallbackRanges(source)
  /** @type {Violation[]} */
  const violations = []

  for (const effect of SIDE_EFFECT_PATTERNS) {
    effect.regex.lastIndex = 0
    let match = effect.regex.exec(source)
    while (match) {
      const index = match.index
      const inTransactionCallback = isInsideAnyRange(index, ranges)
      const inCommitCallback = isInsideAnyRange(index, commitRanges)

      if (inTransactionCallback && !inCommitCallback) {
        const pos = findLineCol(source, index)
        violations.push({
          filePath,
          line: pos.line,
          col: pos.col,
          name: effect.name,
          snippet: match[0].trim(),
        })
      }
      match = effect.regex.exec(source)
    }
  }

  return violations
}

function main() {
  const root = process.cwd()
  const files = listCommandFiles()

  /** @type {Violation[]} */
  const allViolations = []
  for (const rel of files) {
    const abs = path.join(root, rel)
    const violations = findViolationsInFile(abs)
    allViolations.push(...violations)
  }

  if (allViolations.length === 0) {
    console.log(
      '[backend-arch-check] OK: no side-effects inside transaction callbacks in app/actions/**/commands/*.ts'
    )
    process.exit(0)
  }

  console.error('[backend-arch-check][ERROR] Side-effects inside transaction callbacks were found:')
  for (const violation of allViolations) {
    const rel = path.relative(root, violation.filePath)
    console.error(
      `- ${rel}:${violation.line}:${violation.col} ${violation.name} -> ${violation.snippet}`
    )
  }

  process.exit(1)
}

main()
