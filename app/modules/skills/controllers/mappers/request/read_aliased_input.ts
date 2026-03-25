import type { HttpContext } from '@adonisjs/core/http'

/** Read a transport field using its canonical camelCase and legacy snake_case names. */
export function readAliasedInput(
  request: HttpContext['request'],
  camelCaseKey: string,
  snakeCaseKey: string
): unknown {
  return request.input(camelCaseKey) ?? request.input(snakeCaseKey)
}
