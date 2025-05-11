import app from '@adonisjs/core/services/app'
import { ExceptionHandler } from '@adonisjs/core/http'
import type { HttpContext } from '@adonisjs/core/http'

import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'
import type { AllowedSessionValues } from '@adonisjs/session/types'
import Youch from 'youch'
import YouchTerminal from 'youch-terminal'

interface HttpError {
  status: number
  message?: string
}

interface YouchGroupData {
  key: string
  value: string
}

interface YouchInstance {
  group: (name: string, data: Record<string, YouchGroupData[]>) => void
  toHTML: (options: { title: string; ide?: string }) => Promise<string>
  toJSON: () => Promise<Record<string, unknown>>
}

const isHttpError = (err: unknown): err is HttpError => {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as HttpError).status === 'number'
  )
}

const convertToString = (value: AllowedSessionValues): string => {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  return JSON.stringify(value)
}

export default class HttpExceptionHandler extends ExceptionHandler {
  protected override debug = !app.inProduction
  protected override renderStatusPages = true

  protected override statusPages: Record<StatusPageRange, StatusPageRenderer> = {
    '404': (error, { inertia }) => inertia.render('errors/not_found', { error }),
    '500..599': (error, { inertia }) => inertia.render('errors/server_error', { error }),
  }

  override async handle(error: unknown, ctx: HttpContext): Promise<void> {
    const { request, response, session, inertia, auth } = ctx

    if (!app.inProduction && error instanceof Error) {
      const isApiRequest = request.url().startsWith('/api/')
      const isInertiaRequest = request.header('X-Inertia')

      if (!isInertiaRequest || isApiRequest) {
        const youch = new Youch(error, request.request) as unknown as YouchInstance

        const requestInfo: YouchGroupData[] = [
          { key: 'URL', value: request.url() },
          { key: 'Method', value: request.method() },
          { key: 'IP', value: request.ip() },
          { key: 'User Agent', value: request.header('user-agent') || 'N/A' },
        ]
        youch.group('Request', { info: requestInfo })

        const headers = request.headers()
        const headerData: YouchGroupData[] = Object.entries(headers).map(
          ([key, value]: [string, string | string[] | undefined]) => ({
            key,
            value: value === undefined ? '' : Array.isArray(value) ? value.join(', ') : value,
          })
        )
        youch.group('Request', { headers: headerData })

        const queryParams = request.qs()
        const queryKeys = Object.keys(queryParams)
        if (queryKeys.length > 0) {
          const queryData: YouchGroupData[] = Object.entries(queryParams).map(
            ([key, value]: [string, string | string[] | Record<string, unknown>]) => ({
              key,
              value: typeof value === 'string' ? value : JSON.stringify(value),
            })
          )
          youch.group('Request', { queryParams: queryData })
        }

        const body = request.all()
        const bodyKeys = Object.keys(body)
        if (bodyKeys.length > 0) {
          const bodyData: YouchGroupData[] = Object.entries(body)
            .filter(([key]) => !key.toLowerCase().includes('password'))
            .map(
              ([key, value]: [
                string,
                string | number | boolean | Record<string, unknown> | null,
              ]) => ({
                key,
                value:
                  value !== null && typeof value === 'object'
                    ? JSON.stringify(value)
                    : String(value),
              })
            )
          youch.group('Request', { body: bodyData })
        }

        if (auth.user) {
          const userData: YouchGroupData[] = [
            { key: 'ID', value: String(auth.user.id) },
            { key: 'Email', value: auth.user.email },
            { key: 'Username', value: auth.user.username },
          ]
          youch.group('Auth', { user: userData })
        }

        const sessionData = session.all() as Record<string, AllowedSessionValues | undefined>
        const sessionKeys = Object.keys(sessionData)
        if (sessionKeys.length > 0) {
          const sessionDataFormatted: YouchGroupData[] = sessionKeys
            .filter((key) => !key.includes('_token') && !key.includes('password'))
            .map((key) => {
              const value = sessionData[key]
              return {
                key,
                value: value !== undefined ? convertToString(value) : 'undefined',
              }
            })
          youch.group('Session', { data: sessionDataFormatted })
        }

        const html = await youch.toHTML({
          title: error.message,
          ide: process.env.IDE || process.env.EDITOR || 'vscode',
        })
        response.status(500).header('content-type', 'text/html').send(html)
        return
      }
    }

    if (isHttpError(error) && error.status === 419) {
      session.flash('errors', { form: 'Trang đã hết hạn, vui lòng thử lại' })
      response.redirect().back()
      return
    }

    if (isHttpError(error) && error.status === 401) {
      if (request.header('X-Inertia')) {
        await inertia.location('/login')
        return
      }
      session.flash('errors', { form: 'Vui lòng đăng nhập để tiếp tục' })
      response.redirect('/login')
      return
    }

    if (isHttpError(error) && error.status === 403) {
      session.flash('errors', { form: 'Bạn không có quyền thực hiện hành động này' })
      response.redirect().back()
      return
    }

    await super.handle(error, ctx)
  }

  override async report(error: unknown, ctx: HttpContext): Promise<void> {
    if (!app.inProduction && error instanceof Error) {
      const youch = new Youch(error, ctx.request.request) as unknown as YouchInstance
      const output = await youch.toJSON()
      console.log(YouchTerminal(output))
    }

    await super.report(error, ctx)
  }
}
