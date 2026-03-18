import type { SkillSearchDocumentReader } from '#modules/search/actions/ports/outbound/skill_search_document_reader'
import type { SkillSearchDocument } from '#modules/search/domain/skill_search_document'

export class SkillSearchDocumentBuilder {
  constructor(
    private readonly skillSearchDocumentReader: SkillSearchDocumentReader
  ) {}

  async build(skillId: string): Promise<SkillSearchDocument> {
    const skill = await this.skillSearchDocumentReader.findSkillSearchDocumentRecord(skillId)

    return {
      skill_id: skill.skillId,
      skill_code: skill.skillCode,
      skill_name: skill.skillName,
      category_code: skill.categoryCode,
      display_type: skill.displayType,
      description: skill.description,
      is_active: skill.isActive,
      updated_at: skill.updatedAt,
    }
  }
}
