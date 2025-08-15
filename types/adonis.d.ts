import type { LookupListRoute } from '@adonisjs/http-server/types'

declare module '@adonisjs/http-server/types' {
  interface RoutesList {
    [method: string]: { [identifier: string]: LookupListRoute }
    GET: { [key: string]: LookupListRoute }
    POST: { [key: string]: LookupListRoute }
    PUT: { [key: string]: LookupListRoute }
    PATCH: { [key: string]: LookupListRoute }
    DELETE: { [key: string]: LookupListRoute }
    HEAD: { [key: string]: LookupListRoute }
    OPTIONS: { [key: string]: LookupListRoute }
    ALL: { [key: string]: LookupListRoute }
  }
}

declare module '@adonisjs/inertia/types' {
  interface InertiaPages {
    [key: string]: Record<string, any>
  }
}
