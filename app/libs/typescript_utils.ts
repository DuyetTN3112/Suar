/**
 * TypeScript Helper Utilities
 *
 * Các utility functions cho TypeScript.
 * Pattern học từ ancarat-bo: tách riêng các utils theo chức năng.
 *
 * @module TypeScriptUtils
 */

/**
 * Exhaustiveness checking helper (Level 9)
 * Use this in the default case of a switch or final else of if/else chain.
 * If all cases are handled, the variable passed will be of type 'never'.
 * If a case is missed, TypeScript will show a compile-time error.
 *
 * @example
 * ```typescript
 * type Status = 'pending' | 'success';
 * switch (status) {
 *   case 'pending': return ...;
 *   case 'success': return ...;
 *   default: assertNever(status); // Error if a new status is added but not handled here
 * }
 * ```
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${String(x)}`)
}

/**
 * Type-safe Object.keys
 */
export function typedKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[]
}

/**
 * Type-safe Object.entries
 */
export function typedEntries<T extends object>(obj: T): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][]
}

/**
 * Kiểm tra xem một giá trị có phải là object hay không
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Kiểm tra xem một giá trị có phải là array hay không
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value)
}

/**
 * Kiểm tra xem một giá trị có phải là string hay không
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Kiểm tra xem một giá trị có phải là number hay không
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value)
}

/**
 * Kiểm tra xem một giá trị có phải là boolean hay không
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Kiểm tra xem một giá trị có phải là null hoặc undefined hay không
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

/**
 * Kiểm tra xem một giá trị có phải là non-null hay không
 */
export function isNonNullish<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined
}

/**
 * Pick specific keys from an object
 * Type-safe version of lodash's pick
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result: Partial<Pick<T, K>> = {}
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key]
    }
  })
  return result as Pick<T, K>
}

/**
 * Omit specific keys from an object
 * Type-safe version of lodash's omit
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result: Partial<T> = {}
  const keysToOmit = new Set(keys)
  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (!keysToOmit.has(key as K)) {
      result[key] = obj[key]
    }
  }
  return result as Omit<T, K>
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}

/**
 * Merge objects deeply
 */
type DeepPartial<T> =
  T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T

const deepMergeRecords = (
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> => {
  const merged: Record<string, unknown> = { ...target }

  for (const [key, value] of Object.entries(source)) {
    const currentValue = merged[key]

    if (isObject(value) && isObject(currentValue)) {
      merged[key] = deepMergeRecords(currentValue, value)
    } else {
      merged[key] = value
    }
  }

  return merged
}

export function deepMerge<T extends object>(...objects: DeepPartial<T>[]): T {
  let result: Record<string, unknown> = {}

  for (const obj of objects) {
    result = deepMergeRecords(result, obj as Record<string, unknown>)
  }

  return result as T
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    baseDelay?: number
    maxDelay?: number
    shouldRetry?: (error: unknown) => boolean
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000, shouldRetry = () => true } = options

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
      await sleep(delay)
    }
  }

  throw lastError
}
