import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { SEED_PROJECT_ATTACHMENTS_SPECS } from './project_attachments_specs.js'
import type { SeedRuntime } from './seed_runtime.js'
import { applyWhere, findRow } from './seed_utils.js'
import type { ProjectKey, SeededProject, SeededUser, UserKey } from './types.js'

export async function seedProjectAttachments(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  projects: Record<ProjectKey, SeededProject>
): Promise<void> {
  const rows = SEED_PROJECT_ATTACHMENTS_SPECS

  for (const row of rows) {
    const where = {
      project_id: projects[row.project].id,
      file_name: row.file_name,
    }
    const existing = await findRow(trx, 'project_attachments', where)
    const payload = {
      file_path: `/uploads/projects/${projects[row.project].id}/${row.file_name}`,
      file_size: 4096,
      mime_type: row.mime_type,
      uploaded_by: users.owner.id,
      created_at: runtime.isoDaysAgo(5),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existing) {
      await applyWhere(trx.from('project_attachments'), where).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('project_attachments')
        .insert({ id: runtime.uuid(), ...where, ...payload })
    }
  }
}
