import { test } from '@japa/runner'

import ListOrgReviewDisputesQuery from '#modules/reviews/actions/queries/list_org_review_disputes_query'
import ListReverseReviewsQuery from '#modules/reviews/actions/queries/list_reverse_reviews_query'
import ListOrgReviewDisputesController from '#modules/reviews/controllers/list_org_review_disputes_controller'
import ListReverseReviewsController from '#modules/reviews/controllers/list_reverse_reviews_controller'
import ShowOrgDisputesPageController from '#modules/reviews/controllers/show_org_disputes_page_controller'
import ShowReverseReviewsPageController from '#modules/reviews/controllers/show_reverse_reviews_page_controller'

function fakeRequest(body: Record<string, unknown>, url = '/api/org/reviews/disputes') {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(body, key) ? body[key] : fallback
    },
    header() {
      return null
    },
    ip() {
      return '127.0.0.1'
    },
    url() {
      return url
    },
  }
}

function fakeAuth(userId = 'user-1', organizationId: string | null = 'org-1') {
  return {
    user: {
      id: userId,
      current_organization_id: organizationId,
    },
  }
}

function requireValue<T>(value: T, message: string): NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(message)
  }

  return value
}

test.group('Unit | Review read controller aliases', () => {
  test('org review disputes API controller reads camelCase perPage alias', async ({ assert }) => {
    const originalExecute: unknown = Reflect.get(
      ListOrgReviewDisputesQuery.prototype,
      'execute'
    )
    let capturedDto: { perPage?: number; status?: string | null } | null = null

    ListOrgReviewDisputesQuery.prototype.execute = async function execute(dto) {
      await Promise.resolve()
      const resolvedDto: { perPage?: number; status?: string | null } = dto
      capturedDto = resolvedDto
      return {
        data: [],
        meta: {
          total: 0,
          per_page: 1,
          current_page: 1,
          last_page: 0,
          cursor: {
            next_cursor: null,
            previous_cursor: null,
            has_next_page: false,
            has_previous_page: false,
          },
        },
      }
    }

    try {
      const ctx = {
        request: fakeRequest({ perPage: 1, per_page: 20, status: 'pending' }),
        auth: fakeAuth(),
        session: { get() { return null } },
        currentOrganizationId: 'org-1',
      }
      await new ListOrgReviewDisputesController().handle(ctx as never)

      const resolvedDto = requireValue<{ perPage?: number; status?: string | null } | null>(
        capturedDto,
        'Expected org review disputes DTO to be captured'
      )
      assert.equal(resolvedDto.perPage, 1)
      assert.equal(resolvedDto.status, 'pending')
    } finally {
      ListOrgReviewDisputesQuery.prototype.execute =
        originalExecute as ListOrgReviewDisputesQuery['execute']
    }
  })

  test('org review disputes page controller keeps page props stable with camelCase perPage alias', async ({
    assert,
  }) => {
    const originalExecute: unknown = Reflect.get(
      ListOrgReviewDisputesQuery.prototype,
      'execute'
    )
    let capturedDto: { perPage?: number } | null = null

    ListOrgReviewDisputesQuery.prototype.execute = async function execute(dto) {
      await Promise.resolve()
      const resolvedDto: { perPage?: number } = dto
      capturedDto = resolvedDto
      return {
        data: [],
        meta: {
          total: 0,
          per_page: 1,
          current_page: 1,
          last_page: 0,
          cursor: {
            next_cursor: null,
            previous_cursor: null,
            has_next_page: false,
            has_previous_page: false,
          },
        },
      }
    }

    try {
      const ctx = {
        request: fakeRequest({ perPage: 1, per_page: 20 }, '/org/disputes'),
        inertia: {
          render(component: string, props: Record<string, unknown>) {
            return { component, props }
          },
        },
        auth: fakeAuth(),
        session: { get() { return null } },
        currentOrganizationId: 'org-1',
      }
      const rendered = await new ShowOrgDisputesPageController().handle(ctx as never)

      const resolvedDto = requireValue<{ perPage?: number } | null>(
        capturedDto,
        'Expected org disputes page DTO to be captured'
      )
      assert.equal(resolvedDto.perPage, 1)
      const page: { props: { pagination: { perPage: number } } } = rendered as unknown as {
        props: { pagination: { perPage: number } }
      }
      assert.equal(page.props.pagination.perPage, 1)
    } finally {
      ListOrgReviewDisputesQuery.prototype.execute =
        originalExecute as ListOrgReviewDisputesQuery['execute']
    }
  })

  test('reverse reviews API controller reads camelCase perPage alias', async ({ assert }) => {
    const originalExecute: unknown = Reflect.get(
      ListReverseReviewsQuery.prototype,
      'execute'
    )
    let capturedDto: { perPage?: number; scope?: string } | null = null

    ListReverseReviewsQuery.prototype.execute = async function execute(dto) {
      await Promise.resolve()
      const resolvedDto: { perPage?: number; scope?: string } = dto
      capturedDto = resolvedDto
      return {
        data: [],
        meta: {
          total: 0,
          per_page: 1,
          current_page: 1,
          last_page: 0,
        },
        stats: {
          total: 0,
          anonymous: 0,
          by_target_type: {},
        },
      }
    }

    try {
      const ctx = {
        request: fakeRequest({ perPage: 1, per_page: 20 }, '/api/me/reverse-reviews'),
        response: {
          status() {
            return this
          },
        },
        auth: fakeAuth(),
        session: { get() { return null } },
        currentOrganizationId: 'org-1',
      }
      await new ListReverseReviewsController().handle(ctx as never)

      const resolvedDto = requireValue<{ perPage?: number; scope?: string } | null>(
        capturedDto,
        'Expected reverse reviews DTO to be captured'
      )
      assert.equal(resolvedDto.perPage, 1)
      assert.equal(resolvedDto.scope, 'me')
    } finally {
      ListReverseReviewsQuery.prototype.execute =
        originalExecute as ListReverseReviewsQuery['execute']
    }
  })

  test('reverse reviews page controller keeps scope/page props stable with camelCase perPage alias', async ({
    assert,
  }) => {
    const originalExecute: unknown = Reflect.get(
      ListReverseReviewsQuery.prototype,
      'execute'
    )
    let capturedDto: { perPage?: number; scope?: string } | null = null

    ListReverseReviewsQuery.prototype.execute = async function execute(dto) {
      await Promise.resolve()
      const resolvedDto: { perPage?: number; scope?: string } = dto
      capturedDto = resolvedDto
      return {
        data: [],
        meta: {
          total: 0,
          per_page: 1,
          current_page: 1,
          last_page: 0,
        },
        stats: {
          total: 0,
          anonymous: 0,
          by_target_type: {},
        },
      }
    }

    try {
      const ctx = {
        request: fakeRequest({ perPage: 1, per_page: 20 }, '/org/reverse-reviews'),
        inertia: {
          render(component: string, props: Record<string, unknown>) {
            return { component, props }
          },
        },
        auth: fakeAuth(),
        session: { get() { return null } },
        currentOrganizationId: 'org-1',
      }
      const rendered = await new ShowReverseReviewsPageController().handle(ctx as never)

      const resolvedDto = requireValue<{ perPage?: number; scope?: string } | null>(
        capturedDto,
        'Expected reverse reviews page DTO to be captured'
      )
      assert.equal(resolvedDto.perPage, 1)
      assert.equal(resolvedDto.scope, 'org')
      const page: {
        props: { scope: string; pagination: { perPage: number } }
      } = rendered as unknown as {
        props: { scope: string; pagination: { perPage: number } }
      }
      assert.equal(page.props.scope, 'org')
      assert.equal(page.props.pagination.perPage, 1)
    } finally {
      ListReverseReviewsQuery.prototype.execute =
        originalExecute as ListReverseReviewsQuery['execute']
    }
  })
})
