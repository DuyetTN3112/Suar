/*
 * The relocation tree currently exports saved-view/domain shapes through `any` declarations.
 * Keep this adapter's runtime authorization logic lintable while those shared contracts are typed.
 */
/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

import db from '@adonisjs/lucid/services/db'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type {
  FilterSavedViewAction,
  FilterSavedViewAuthorization,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_authorization'
import type {
  FilterSavedViewGrantTarget,
  FilterSavedViewOwner,
  FilterSavedViewRecord,
} from '#modules/filtering/actions/ports/outbound/saved-filter-views/filter_saved_view_repository'
import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'

type GrantRow = {
  grantee_type: 'user' | 'organization' | 'team'
  grantee_id: string
  can_read: boolean
  can_edit: boolean
  can_share: boolean
  can_subscribe: boolean
}

function user(principal: FilterPrincipal): principal is FilterPrincipal & { id: string } {
  return principal.kind === 'user' && typeof principal.id === 'string' && principal.id.length > 0
}

export class PostgresFilterSavedViewAuthorization implements FilterSavedViewAuthorization {
  async canCreate(input: { principal: FilterPrincipal; owner: FilterSavedViewOwner }): Promise<boolean> {
    if (!user(input.principal)) return false
    if (input.owner.type === 'user') return input.owner.id === input.principal.id
    return this.isApprovedMember(input.principal.id, input.owner.id)
  }

  async canPerform(input: {
    principal: FilterPrincipal
    action: FilterSavedViewAction
    record: FilterSavedViewRecord
  }): Promise<boolean> {
    if (!user(input.principal) || input.record.deletedAt !== null) return false
    const principal = input.principal
    const record = input.record
    const owner = record.owner.type === 'user'
      ? record.owner.id === principal.id
      : await this.isApprovedMember(principal.id, record.owner.id)
    if (owner) return true

    if (record.view.visibility === 'private') {
      return this.hasGrant(record.view.id, principal, input.action)
    }
    if (!record.view.organizationId || principal.organizationId !== record.view.organizationId) {
      return false
    }
    if (!(await this.isApprovedMember(principal.id, record.view.organizationId))) return false
    if (record.view.visibility === 'organization' && input.action === 'read') return true
    return this.hasGrant(record.view.id, principal, input.action)
  }

  async canShareWith(input: {
    principal: FilterPrincipal
    record: FilterSavedViewRecord
    target: FilterSavedViewGrantTarget
  }): Promise<boolean> {
    if (!(await this.canPerform({ principal: input.principal, action: 'share', record: input.record }))) {
      return false
    }
    if (input.target.type === 'user') {
      const organizationId = input.principal.organizationId
      return organizationId !== undefined && organizationId === input.record.view.organizationId
        ? this.isApprovedMember(input.target.id, organizationId)
        : input.target.id === input.principal.id
    }
    if (input.target.type === 'organization') {
      const principal = input.principal
      return (
        principal.organizationId === input.target.id &&
        user(principal) &&
        (await this.isApprovedMember(principal.id, input.target.id))
      )
    }
    return false
  }

  async listAuthorizedViewIds(input: {
    principal: FilterPrincipal
    context: string
    action: 'read'
  }): Promise<readonly string[]> {
    if (!user(input.principal)) return []
    const rows = await db.from('filter_saved_views')
      .select('id')
      .where('context_key', input.context)
      .whereNull('deleted_at')
    const ids: string[] = []
    for (const row of rows as Array<{ id: string }>) {
      const authorized = await this.canPerform({
        principal: input.principal,
        action: input.action,
        record: await this.recordForAuthorization(row.id),
      })
      if (authorized) ids.push(row.id)
    }
    return ids
  }

  private async isApprovedMember(userId: string, organizationId: string): Promise<boolean> {
    if (!userId || !organizationId) return false
    const row = await db.from('organization_users')
      .select('user_id')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .where('status', 'approved')
      .first()
    return row !== undefined && row !== null
  }

  private async hasGrant(viewId: string, principal: FilterPrincipal, action: FilterSavedViewAction): Promise<boolean> {
    if (!user(principal)) return false
    const grants = await db.from('filter_saved_view_grants')
      .where('saved_view_id', viewId)
      .whereNull('revoked_at') as GrantRow[]
    for (const grant of grants) {
      const matches = grant.grantee_type === 'user'
        ? grant.grantee_id === principal.id
        : grant.grantee_type === 'organization'
          ? principal.organizationId === grant.grantee_id && await this.isApprovedMember(principal.id, grant.grantee_id)
          : false
      if (!matches) continue
      if (action === 'read' && grant.can_read) return true
      if (action === 'edit' && grant.can_edit) return true
      if (action === 'delete' && grant.can_edit) return true
      if (action === 'share' && grant.can_share) return true
      if (action === 'subscribe' && grant.can_subscribe) return true
    }
    return false
  }

  private async recordForAuthorization(viewId: string): Promise<FilterSavedViewRecord> {
    const { PostgresFilterSavedViewRepository } = await import('#modules/filtering/infra/repositories/saved-filter-views/postgres_filter_saved_view_repository')
    const record = await new PostgresFilterSavedViewRepository().findById(viewId)
    if (!record) throw NotFoundException.resource('Saved Filter View', viewId)
    return record
  }
}

export default PostgresFilterSavedViewAuthorization
