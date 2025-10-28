import { LucidSkillSearchDocumentReader } from '#modules/skills/infra/adapters/lucid_skill_search_document_reader'
import { LucidSkillSearchSyncReader } from '#modules/skills/infra/adapters/lucid_skill_search_sync_reader'

export const skillSearchDocumentReader = new LucidSkillSearchDocumentReader()
export const skillSearchSyncReader = new LucidSkillSearchSyncReader()
