// @ts-nocheck
var __defProp = Object.defineProperty
var __name = (target, value) => __defProp(target, 'name', { value, configurable: true })
import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
class ListSavedFilterViewsQuery {
  constructor(repository, authorization) {
    this.repository = repository
    this.authorization = authorization
  }
  repository
  authorization
  static {
    __name(this, 'ListSavedFilterViewsQuery')
  }
  async executeAndWrap(input) {
    try {
      return Result.ok(await this.execute(input))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }
  async execute(input) {
    const viewIds = await this.authorization.listAuthorizedViewIds({
      principal: input.principal,
      context: input.context,
      action: 'read',
    })
    const candidates = await this.repository.listByIds({ viewIds, context: input.context })
    const decisions = await Promise.all(
      candidates.map((record) =>
        this.authorization.canPerform({ principal: input.principal, action: 'read', record })
      )
    )
    return candidates.filter((_record, index) => decisions[index] === true)
  }
}
export { ListSavedFilterViewsQuery }
