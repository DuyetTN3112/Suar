import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserRecruiterBookmarkActionFactory } from '#modules/users/actions/ports/inbound/user_recruiter_bookmark_action_factory'

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
export default class OrgBookmarksPageController {
  constructor(private readonly bookmarkActions: UserRecruiterBookmarkActionFactory) {}

  async handle(ctx: HttpContext) {
    const result = await this.bookmarkActions
      .makeWorkspace(actionContextFromHttp(ctx))
      .executeAndWrap(
        omitUndefined({
          q: typeof ctx.request.input('q') === 'string' ? ctx.request.input('q') as string : undefined,
          folder: typeof ctx.request.input('folder') === 'string' ? ctx.request.input('folder') as string : undefined,
          page: Number(ctx.request.input('page') ?? 1),
          per_page: Number(ctx.request.input('perPage') ?? ctx.request.input('per_page') ?? 10),
        })
      )

    if (result.isFailure()) {
      ctx.session.flash('error', 'Talent đã lưu chỉ dành cho người quản lý trong tổ chức.')
      ctx.response.redirect('/marketplace/tasks')
      return
    }

    return ctx.inertia.render('org/bookmarks/index', result.getValue())
  }
}
