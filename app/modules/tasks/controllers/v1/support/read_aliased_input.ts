import type { HttpContext } from '@adonisjs/core/http'

export function readAliasedInput(
  request: HttpContext['request'],
  camelCaseKey: string,
  snakeCaseKey: string
): unknown {
  return request.input(camelCaseKey) ?? request.input(snakeCaseKey)
}
