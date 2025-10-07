import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import type { ApiAuthContract } from '#modules/auth/boundary/api_auth_contract'

export default class BindApiAuthContractMiddleware {
  async handle(ctx: HttpContext, next: NextFn, contract: ApiAuthContract): Promise<void> {
    ctx.apiAuthContract = contract
    await next()
  }
}

declare module '@adonisjs/core/http' {
  interface HttpContext {
    apiAuthContract?: ApiAuthContract
  }
}
