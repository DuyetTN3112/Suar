import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import GetMyApplicationsQuery from '#actions/tasks/queries/get_my_applications_query'
import { ApplicationStatus } from '#constants/task_constants'

const isSerializable = (value: unknown): value is { serialize: () => unknown } => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'serialize' in value &&
    typeof (value as { serialize?: unknown }).serialize === 'function'
  )
}

function validateStatus(value: string): ApplicationStatus | 'all' {
  const validStatuses: string[] = Object.values(ApplicationStatus)
  if (validStatuses.includes(value) || value === 'all') {
    return value as ApplicationStatus | 'all'
  }
  return 'all'
}

/**
 * GET /my-applications → List my applications (freelancer view)
 */
export default class MyApplicationsController {
  async handle(ctx: HttpContext) {
    const { request, inertia } = ctx

    const toPageNumber = (value: unknown, fallback: number): number => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(1, Math.trunc(value))
      }
      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : fallback
      }
      return fallback
    }

    const query = new GetMyApplicationsQuery(ExecutionContext.fromHttp(ctx))
    const statusRaw = request.input('status', 'all') as unknown
    const statusFilter = validateStatus(typeof statusRaw === 'string' ? statusRaw : 'all')
    const page = toPageNumber(request.input('page', 1) as unknown, 1)
    const perPage = toPageNumber(request.input('per_page', 20) as unknown, 20)

    const result = await query.handle({
      status: statusFilter,
      page,
      per_page: perPage,
    })

    return inertia.render('applications/my-applications', {
      applications: result.data.map((application) => {
        return isSerializable(application) ? application.serialize() : application
      }),
      meta: result.meta,
      statusFilter: statusFilter,
    })
  }
}
