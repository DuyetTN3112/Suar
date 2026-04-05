import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import {
  parsePersistedObjectArray,
  parsePersistedStringArray,
} from '#modules/errors/public_contracts/persisted_json_array'
import { BaseCommand } from '#modules/users/actions/base_command'
import type { TransactionalAuditOptions } from '#modules/users/actions/dtos/transactional_audit'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type {
  UserTransaction,
  UserTransactionRunner,
} from '#modules/users/actions/ports/outbound/user_transaction'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import { calculateDomainExpertiseMetrics } from '#modules/users/domain/profile_aggregate_rules'

export interface UpsertUserDomainExpertiseDTO {
  userId: string
}

export interface UpsertUserDomainExpertiseResult {
  userId: string
  expertiseId: string
  topSkillsCount: number
}

interface WorkHistoryRow {
  id: string
  tech_stack: unknown
  domain_tags: unknown
  business_domain: string | null
  problem_category: string | null
  skill_scores: unknown
}

export default class UpsertUserDomainExpertiseCommand extends BaseCommand<
  UpsertUserDomainExpertiseDTO,
  UpsertUserDomainExpertiseResult
> {
  constructor(
    context: UserActionContext,
    transactions: UserTransactionRunner,
    private readonly profiles: UserProfileRepository
  ) {
    super(context, transactions)
  }

  async handle(dto: UpsertUserDomainExpertiseDTO): Promise<UpsertUserDomainExpertiseResult> {
    return await this.executeInTransaction((trx) => this.handleInTransaction(dto, trx))
  }

  async handleInTransaction(
    dto: UpsertUserDomainExpertiseDTO,
    trx: UserTransaction,
    auditOptions: TransactionalAuditOptions = {}
  ): Promise<UpsertUserDomainExpertiseResult> {
    const historyRows = (await this.profiles.listDomainExpertiseRows(
      dto.userId,
      trx
    )) as unknown as WorkHistoryRow[]
    const metrics = calculateDomainExpertiseMetrics(
      historyRows.map((row) => ({
        techStack: parsePersistedStringArray(row.tech_stack, {
          table: 'user_work_history',
          field: 'tech_stack',
          recordId: row.id,
        }),
        domainTags: parsePersistedStringArray(row.domain_tags, {
          table: 'user_work_history',
          field: 'domain_tags',
          recordId: row.id,
        }),
        businessDomain: row.business_domain,
        problemCategory: row.problem_category,
        skillScores: parsePersistedObjectArray(row.skill_scores, {
          table: 'user_work_history',
          field: 'skill_scores',
          recordId: row.id,
        }).map((skill) => ({
          skillName: typeof skill['skill_name'] === 'string' ? skill['skill_name'] : null,
          assignedLevelCode:
            typeof skill['assigned_public_proficiency_code'] === 'string'
              ? skill['assigned_public_proficiency_code']
              : null,
        })),
      }))
    )

    const payload = {
      user_id: dto.userId,
      tech_stack_frequency: metrics.techStackFrequency,
      domain_frequency: metrics.domainFrequency,
      problem_category_frequency: metrics.problemCategoryFrequency,
      top_skills: metrics.topSkills,
      calculated_at: DateTime.now(),
    }

    const existing = await this.profiles.findDomainExpertise(dto.userId, trx)

    let expertiseId: string
    if (existing) {
      await this.profiles.updateDomainExpertise(existing.id, payload, trx)
      expertiseId = existing.id
    } else {
      const created = await this.profiles.createDomainExpertise(payload, trx)
      expertiseId = created.id
    }

    const auditWrite = async () => {
      if (this.execCtx.userId) {
        await auditPublicApi.write(
          this.execCtx,
          {
            user_id: this.execCtx.userId,
            action: 'upsert_user_domain_expertise',
            critical: true,
            entity_type: 'user_domain_expertise',
            entity_id: dto.userId,
            old_values: null,
            new_values: {
              expertise_id: expertiseId,
              total_domains: Object.keys(metrics.domainFrequency).length,
              total_tech_stack: Object.keys(metrics.techStackFrequency).length,
              top_skills_count: metrics.topSkills.length,
            },
          },
          trx
        )
      }
    }
    if (auditOptions.deferAuditWrite) {
      auditOptions.deferAuditWrite(auditWrite)
    } else {
      await auditWrite()
    }

    return {
      userId: dto.userId,
      expertiseId,
      topSkillsCount: metrics.topSkills.length,
    }
  }
}
