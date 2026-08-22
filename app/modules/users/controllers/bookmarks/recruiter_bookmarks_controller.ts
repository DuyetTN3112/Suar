import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserRecruiterBookmarkActionFactory } from '#modules/users/actions/ports/inbound/user_recruiter_bookmark_action_factory'
import {
  mapRecruiterBookmarkApiBody,
  mapRecruiterBookmarksApiBody,
} from '#modules/users/controllers/mappers/response/profile/user_response_mapper'

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
export default class RecruiterBookmarksController {
  constructor(private readonly bookmarkActions: UserRecruiterBookmarkActionFactory) {}

  async index(ctx: HttpContext) {
    const result = await this.bookmarkActions
      .makeList(actionContextFromHttp(ctx))
      .executeAndWrap({})
    return mapRecruiterBookmarksApiBody(result.getValue())
  }

  async store(ctx: HttpContext) {
    const request = ctx.request
    const result = await this.bookmarkActions
      .makeCreate(actionContextFromHttp(ctx))
      .executeAndWrap(
        omitUndefined({
          talent_user_id: (ctx.params['userId'] ?? request.input('talentUserId') ?? request.input('talent_user_id')) as string,
          notes: typeof request.input('notes') === 'string' ? request.input('notes') as string : undefined,
          folder: typeof request.input('folder') === 'string' ? request.input('folder') as string : undefined,
          rating: request.input('rating') !== undefined ? Number(request.input('rating')) : undefined,
        })
      )
    return mapRecruiterBookmarkApiBody(result.getValue())
  }

  async update(ctx: HttpContext) {
    const request = ctx.request
    const result = await this.bookmarkActions
      .makeUpdate(actionContextFromHttp(ctx))
      .executeAndWrap(
        omitUndefined({
          id: ctx.params['bookmarkId'] as string,
          notes: typeof request.input('notes') === 'string' ? request.input('notes') as string : undefined,
          folder: typeof request.input('folder') === 'string' ? request.input('folder') as string : undefined,
          rating: request.input('rating') !== undefined ? Number(request.input('rating')) : undefined,
        })
      )
    return mapRecruiterBookmarkApiBody(result.getValue())
  }

  async destroy(ctx: HttpContext) {
    const result = await this.bookmarkActions
      .makeDelete(actionContextFromHttp(ctx))
      .executeAndWrap({ id: ctx.params['bookmarkId'] as string })
    result.getValue()
    ctx.response.noContent()
  }

  async destroyByTalent(ctx: HttpContext) {
    const result = await this.bookmarkActions
      .makeDeleteByTalent(actionContextFromHttp(ctx))
      .executeAndWrap({ talentUserId: ctx.params['userId'] as string })
    result.getValue()
    ctx.response.noContent()
  }

}
