import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export interface TaskTalentMatchContextSourceRow {
  task_id: string
  business_domain: string | null
  problem_category: string | null
  task_type: string | null
  requirement_id: string | null
  skill_id: string | null
  required_public_proficiency_code: string | null
  is_mandatory: boolean | null
  minimum_level_id: string | null
  target_level_id: string | null
  assessment_ceiling_level_id: string | null
  importance: string | null
  weight: number | string | null
  project_skill_id: string | null
  rubric_version_id: string | null
}

/**
 * Resolve one organization-scoped task and its requirements in one bounded batch.
 * Skill names deliberately stay outside this Tasks-owned contract.
 */
export async function listTaskTalentMatchContextSourceRows(
  lookup: string,
  organizationId: string | null,
  trx?: TransactionClientContract
): Promise<TaskTalentMatchContextSourceRow[]> {
  const client = trx ?? db
  const query = client
    .from('tasks as t')
    .leftJoin('task_required_skills as trs', 'trs.task_id', 't.id')
    .whereNull('t.deleted_at')
    .where((builder) => {
      void builder
        .whereRaw('LOWER(t.id::text) = LOWER(?)', [lookup])
        .orWhereRaw('LOWER(t.title) = LOWER(?)', [lookup])
    })
    .select(
      't.id as task_id',
      't.business_domain',
      't.problem_category',
      't.task_type',
      'trs.id as requirement_id',
      'trs.skill_id',
      'trs.required_public_proficiency_code',
      'trs.is_mandatory',
      'trs.minimum_level_id',
      'trs.target_level_id',
      'trs.assessment_ceiling_level_id',
      'trs.importance',
      'trs.weight',
      'trs.project_skill_id',
      'trs.rubric_version_id'
    )
    .orderByRaw('CASE WHEN LOWER(t.id::text) = LOWER(?) THEN 0 ELSE 1 END', [lookup])
    .orderBy('t.id', 'asc')
    .orderBy('trs.id', 'asc')

  if (organizationId !== null) {
    void query.where('t.organization_id', organizationId)
  }

  return (await query) as TaskTalentMatchContextSourceRow[]
}
