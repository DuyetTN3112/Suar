// @ts-nocheck
var __defProp = Object.defineProperty
var __name = (target, value) => __defProp(target, 'name', { value, configurable: true })
import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import { requireSavedViewContext } from '#modules/filtering/actions/commands/saved-filter-views/create_saved_filter_view_command'
import { FilterSavedViewAccessError } from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_authorization'
class ExecuteSavedFilterViewQuery {
  constructor(repository, authorization, contexts, criteriaExecutor) {
    this.repository = repository
    this.authorization = authorization
    this.contexts = contexts
    this.criteriaExecutor = criteriaExecutor
  }
  repository
  authorization
  contexts
  criteriaExecutor
  static {
    __name(this, 'ExecuteSavedFilterViewQuery')
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
      record.migrationState !== 'current' ||
      !(await this.authorization.canPerform({ principal: input.principal, action: 'read', record }))
    ) {
      throw new FilterSavedViewAccessError()
    }
    await requireSavedViewContext(this.contexts, {
      context: record.view.context,
      principal: input.principal,
    })
    const semantic = record.view.semanticState
    const criteria = {
      context: record.view.context.key,
      schemaVersion: record.view.context.schemaVersion,
      ...(semantic.textQuery === null ? {} : { text: { value: semantic.textQuery } }),
      ...(semantic.filter === null ? {} : { filter: semantic.filter }),
      sort: semantic.sort,
      projection: semantic.projection,
      page: input.page,
    }
    return this.criteriaExecutor.execute({
      criteria,
      principal: input.principal,
      requestId: input.requestId,
      ...(input.signal === void 0 ? {} : { signal: input.signal }),
    })
  }
}
export { ExecuteSavedFilterViewQuery }
