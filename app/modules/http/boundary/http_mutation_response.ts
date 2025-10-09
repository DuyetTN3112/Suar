import type { HttpContext } from '@adonisjs/core/http'

import {
  classifyHttpTransport,
  isApiTransport,
} from './http_transport.js'

type RedirectBackInput = {
  kind: 'back'
}

type RedirectRouteInput<RouteName extends string> = {
  kind: 'route'
  to: RouteName
}

type MutationRedirectInput<RouteName extends string> =
  | RedirectBackInput
  | RedirectRouteInput<RouteName>

interface RespondMutationSuccessInput<RouteName extends string> {
  redirect: MutationRedirectInput<RouteName>
  successMessage: string
}

export function respondMutationSuccess<RouteName extends string>(
  ctx: HttpContext,
  input: RespondMutationSuccessInput<RouteName>
): void {
  const transport = classifyHttpTransport(ctx)

  if (isApiTransport(transport)) {
    ctx.response.noContent()
    return
  }

  ctx.session.flash('success', input.successMessage)
  const redirect = ctx.response.redirect() as {
    back: () => void
    toRoute: (route: string) => void
  }

  if (input.redirect.kind === 'back') {
    redirect.back()
    return
  }

  redirect.toRoute(input.redirect.to)
}

interface RespondCreatedMutationSuccessInput<
  RouteName extends string,
  Body,
> {
  apiBody: Body
  redirect: MutationRedirectInput<RouteName>
  successMessage: string
  status?: number
}

export function respondCreatedMutationSuccess<
  RouteName extends string,
  Body,
>(
  ctx: HttpContext,
  input: RespondCreatedMutationSuccessInput<RouteName, Body>
): void {
  const transport = classifyHttpTransport(ctx)

  if (isApiTransport(transport)) {
    ctx.response.status(input.status ?? 201).json(input.apiBody)
    return
  }

  ctx.session.flash('success', input.successMessage)
  const redirect = ctx.response.redirect() as {
    back: () => void
    toRoute: (route: string) => void
  }

  if (input.redirect.kind === 'back') {
    redirect.back()
    return
  }

  redirect.toRoute(input.redirect.to)
}
