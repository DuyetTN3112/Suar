import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserTalentQueryFactory } from '#modules/users/actions/ports/inbound/user_talent_query_factory'
import { mapTalentSearchApiBody } from '#modules/users/controllers/mappers/response/profile/user_response_mapper'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}



@inject()
export default class TalentsSearchController {
  constructor(private readonly talentQueries: UserTalentQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { request } = ctx
    const q = request.input('q') as unknown
    const taskId = (request.input('taskId') as unknown) ?? (request.input('task_id') as unknown)

    const query = this.talentQueries.makeRecruitingSearch(actionContextFromHttp(ctx))
    const result = await query
      .executeAndWrap(
        omitUndefined({
          q: typeof q === 'string' ? q : undefined,
          task_id: typeof taskId === 'string' ? taskId : undefined,
        })
      )
      .then((outcome) => outcome.getValue())

    return mapTalentSearchApiBody(result)
  }

}
