import type { HttpContext } from '@adonisjs/core/http'

interface NamedRouteMiddlewareInfo {
  name?: string
}

export type HttpOrgContextContract = 'required' | 'optional'

function flattenMiddlewareNames(ctx: HttpContext): string[] {
  const routeMiddleware = ctx.route?.middleware
  if (!routeMiddleware || typeof routeMiddleware.all !== 'function') {
    return []
  }

  return Array.from(routeMiddleware.all())
    .map((entry) => {
      const info = entry as NamedRouteMiddlewareInfo | null | undefined
      return typeof info?.name === 'string' ? info.name : null
    })
    .filter((name): name is string => Boolean(name))
}

export function readHttpOrgContextContract(ctx: HttpContext): HttpOrgContextContract {
  const middlewareNames = flattenMiddlewareNames(ctx)

  if (middlewareNames.includes('requireOrg')) {
    return 'required'
  }

  return 'optional'
}
