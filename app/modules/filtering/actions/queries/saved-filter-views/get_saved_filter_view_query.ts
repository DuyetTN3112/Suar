// @ts-nocheck
var __defProp = Object.defineProperty
var __name = (target, value) => __defProp(target, 'name', { value, configurable: true })
import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import { FilterSavedViewAccessError } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_authorization'
class GetSavedFilterViewQuery {
  constructor(repository, authorization) {
    this.repository = repository
    this.authorization = authorization
  }
  repository
  authorization
  static {
    __name(this, 'GetSavedFilterViewQuery')
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
    const record = await this.repository.findById(input.viewId)
    if (
      record === null ||
      !(await this.authorization.canPerform({ principal: input.principal, action: 'read', record }))
    ) {
      throw new FilterSavedViewAccessError()
    }
    return record
  }
}
export { GetSavedFilterViewQuery }
