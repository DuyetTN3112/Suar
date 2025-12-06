# Skills Backend Module

### Kiến trúc lõi & Phân tích nghiệp vụ
- **Proficiency Scale**: Hệ thống sử dụng duy nhất một proficiency scale hoạt động đồng thời (active) trên toàn hệ thống. Cấp độ (level) được định nghĩa trong `proficiency_levels`, tích hợp trường `ordinal` đại diện cho thứ tự số học dùng trong việc so sánh và tính toán điểm số.
- **Skill Rubric**: Mỗi kĩ năng có một rubric riêng định nghĩa cụ thể hành vi mong muốn cho từng level. Các bản ghi rubric được quản lý phiên bản nghiêm ngặt qua `skill_rubric_versions` và `skill_rubric_levels`.
- **Professional Role**: Phân tách thành hai thực thể: Global template (`professional_role_templates`) làm mẫu chung hệ thống, và phiên bản thực tế của dự án (`project_professional_roles`). Professional role chỉ mang tính mô tả nhóm năng lực và hoàn toàn độc lập với quyền hệ thống (Authorization).

## Module Path

```text
app/modules/skills
```

## Folder And File Inventory

```text
./ README.md
actions/ports/ skill_external_dependencies.ts skill_external_dependencies_impl.ts
actions/ public_api.ts
actions/queries/ get_active_skills_query.ts
actions/services/ professional_role_service.ts proficiency_scale_service.ts project_skill_service.ts skill_public_api.ts skill_rubric_service.ts
controllers/ add_project_skill_controller.ts create_project_role_controller.ts deactivate_project_role_controller.ts deactivate_project_skill_controller.ts list_active_skills_controller.ts list_proficiency_scales_controller.ts list_project_roles_controller.ts list_project_skills_controller.ts list_role_templates_controller.ts list_skill_rubrics_controller.ts project_auth_helper.ts show_proficiency_scale_controller.ts show_skill_rubric_controller.ts update_project_role_skill_controller.ts update_project_skill_controller.ts
events/ skill_events.ts
infra/models/ professional_role_template.ts professional_role_template_skill.ts proficiency_level.ts proficiency_scale.ts project_professional_role.ts project_professional_role_skill.ts project_skill.ts skill.ts skill_alias.ts skill_rubric_level.ts skill_rubric_version.ts
infra/repositories/ professional_role_repository.ts proficiency_scale_repository.ts project_skill_repository.ts skill_repository.ts skill_rubric_repository.ts
infra/repositories/read/ skill_queries.ts user_skill_queries.ts
infra/repositories/write/ README.md
public_contracts/ skill_public_api.ts
```

## Route Evidence

```text
start/routes/skills.ts
```

## Symbol Evidence

| Kind | Symbol | File | Line |
|---|---|---|---:|
| interface | `SkillActiveSkillOption` | `app/modules/skills/actions/ports/skill_external_dependencies.ts` | 2 |
| interface | `SkillReader` | `app/modules/skills/actions/ports/skill_external_dependencies.ts` | 8 |
| interface | `SkillExternalDependencies` | `app/modules/skills/actions/ports/skill_external_dependencies.ts` | 12 |
| class | `InfraSkillReader` | `app/modules/skills/actions/ports/skill_external_dependencies_impl.ts` | 9 |
| const | `DefaultSkillDependencies` | `app/modules/skills/actions/ports/skill_external_dependencies_impl.ts` | 21 |
| class | `GetActiveSkillsQuery` | `app/modules/skills/actions/queries/get_active_skills_query.ts` | 10 |
| class | `ProfessionalRoleService` | `app/modules/skills/actions/services/professional_role_service.ts` | 57 |
| class | `ProficiencyScaleService` | `app/modules/skills/actions/services/proficiency_scale_service.ts` | 3 |
| class | `ProjectSkillService` | `app/modules/skills/actions/services/project_skill_service.ts` | 3 |
| class | `SkillPublicApi` | `app/modules/skills/actions/services/skill_public_api.ts` | 9 |
| const | `skillPublicApi` | `app/modules/skills/actions/services/skill_public_api.ts` | 57 |
| class | `SkillRubricService` | `app/modules/skills/actions/services/skill_rubric_service.ts` | 7 |
| class | `AddProjectSkillController` | `app/modules/skills/controllers/add_project_skill_controller.ts` | 7 |
| class | `CreateProjectRoleController` | `app/modules/skills/controllers/create_project_role_controller.ts` | 7 |
| class | `DeactivateProjectRoleController` | `app/modules/skills/controllers/deactivate_project_role_controller.ts` | 8 |
| class | `DeactivateProjectSkillController` | `app/modules/skills/controllers/deactivate_project_skill_controller.ts` | 7 |
| class | `ListActiveSkillsController` | `app/modules/skills/controllers/list_active_skills_controller.ts` | 4 |
| class | `ListProficiencyScalesController` | `app/modules/skills/controllers/list_proficiency_scales_controller.ts` | 5 |
| class | `ListProjectRolesController` | `app/modules/skills/controllers/list_project_roles_controller.ts` | 5 |
| class | `ListProjectSkillsController` | `app/modules/skills/controllers/list_project_skills_controller.ts` | 5 |
| class | `ListRoleTemplatesController` | `app/modules/skills/controllers/list_role_templates_controller.ts` | 4 |
| class | `ListSkillRubricsController` | `app/modules/skills/controllers/list_skill_rubrics_controller.ts` | 6 |
| class | `ShowProficiencyScaleController` | `app/modules/skills/controllers/show_proficiency_scale_controller.ts` | 6 |
| class | `ShowSkillRubricController` | `app/modules/skills/controllers/show_skill_rubric_controller.ts` | 6 |
| class | `UpdateProjectRoleSkillController` | `app/modules/skills/controllers/update_project_role_skill_controller.ts` | 8 |
| class | `UpdateProjectSkillController` | `app/modules/skills/controllers/update_project_skill_controller.ts` | 8 |
| interface | `SkillScoreUpdatedEvent` | `app/modules/skills/events/skill_events.ts` | 2 |
| class | `ProfessionalRoleTemplate` | `app/modules/skills/infra/models/professional_role_template.ts` | 7 |
| class | `ProfessionalRoleTemplateSkill` | `app/modules/skills/infra/models/professional_role_template_skill.ts` | 9 |
| class | `ProficiencyLevel` | `app/modules/skills/infra/models/proficiency_level.ts` | 8 |
| class | `ProficiencyScale` | `app/modules/skills/infra/models/proficiency_scale.ts` | 7 |
| class | `ProjectProfessionalRole` | `app/modules/skills/infra/models/project_professional_role.ts` | 8 |
| class | `ProjectProfessionalRoleSkill` | `app/modules/skills/infra/models/project_professional_role_skill.ts` | 9 |
| class | `ProjectSkill` | `app/modules/skills/infra/models/project_skill.ts` | 8 |
| class | `Skill` | `app/modules/skills/infra/models/skill.ts` | 19 |
| class | `SkillAlias` | `app/modules/skills/infra/models/skill_alias.ts` | 6 |
| class | `SkillRubricLevel` | `app/modules/skills/infra/models/skill_rubric_level.ts` | 25 |
| class | `SkillRubricVersion` | `app/modules/skills/infra/models/skill_rubric_version.ts` | 7 |
| class | `ProfessionalRoleRepository` | `app/modules/skills/infra/repositories/professional_role_repository.ts` | 15 |
| class | `ProficiencyScaleRepository` | `app/modules/skills/infra/repositories/proficiency_scale_repository.ts` | 12 |
| class | `ProjectSkillRepository` | `app/modules/skills/infra/repositories/project_skill_repository.ts` | 14 |
| const | `activeSkills` | `app/modules/skills/infra/repositories/read/skill_queries.ts` | 5 |
| const | `byCategory` | `app/modules/skills/infra/repositories/read/skill_queries.ts` | 9 |
| const | `getSpiderChartSkillIds` | `app/modules/skills/infra/repositories/read/skill_queries.ts` | 16 |
| const | `findActiveByIds` | `app/modules/skills/infra/repositories/read/skill_queries.ts` | 28 |
| const | `findByIds` | `app/modules/skills/infra/repositories/read/skill_queries.ts` | 37 |
| const | `findByUserAndSkill` | `app/modules/skills/infra/repositories/read/user_skill_queries.ts` | 5 |
| const | `getUserSkillsWithDetails` | `app/modules/skills/infra/repositories/read/user_skill_queries.ts` | 9 |
| const | `findUserSkillsWithSkill` | `app/modules/skills/infra/repositories/read/user_skill_queries.ts` | 16 |
| class | `SkillRepository` | `app/modules/skills/infra/repositories/skill_repository.ts` | 16 |
| class | `SkillRubricRepository` | `app/modules/skills/infra/repositories/skill_rubric_repository.ts` | 14 |

## Import Evidence

### `app/modules/skills/actions/ports/skill_external_dependencies.ts`

```ts
// no imports
```

### `app/modules/skills/actions/ports/skill_external_dependencies_impl.ts`

```ts
import type {
  SkillActiveSkillOption,
  SkillExternalDependencies,
  SkillReader,
} from './skill_external_dependencies.js'
import SkillRepository from '#modules/skills/infra/repositories/skill_repository'
```

### `app/modules/skills/actions/public_api.ts`

```ts
// no imports
```

### `app/modules/skills/actions/queries/get_active_skills_query.ts`

```ts
import type { SkillExternalDependencies } from '../ports/skill_external_dependencies.js'
import { DefaultSkillDependencies } from '../ports/skill_external_dependencies_impl.js'
```

### `app/modules/skills/actions/services/professional_role_service.ts`

```ts
import {
  ProfessionalRoleRepository,
  type ProfessionalRoleTemplate,
  type ProfessionalRoleTemplateSkill,
  type ProjectProfessionalRole,
  type ProjectProfessionalRoleSkill,
} from '#modules/skills/infra/repositories/professional_role_repository'
import { ProjectSkillRepository } from '#modules/skills/infra/repositories/project_skill_repository'
import { ProficiencyScaleRepository } from '#modules/skills/infra/repositories/proficiency_scale_repository'
import { ProjectSkillService } from './project_skill_service.js'
```

### `app/modules/skills/actions/services/proficiency_scale_service.ts`

```ts
import { ProficiencyScaleRepository } from '#modules/skills/infra/repositories/proficiency_scale_repository'
```

### `app/modules/skills/actions/services/project_skill_service.ts`

```ts
import { ProjectSkillRepository, type ProjectSkill } from '#modules/skills/infra/repositories/project_skill_repository'
```

### `app/modules/skills/actions/services/skill_public_api.ts`

```ts
import GetActiveSkillsQuery from '../queries/get_active_skills_query.js'
import SkillRepository from '#modules/skills/infra/repositories/skill_repository'
import { ProficiencyScaleRepository } from '#modules/skills/infra/repositories/proficiency_scale_repository'
import { SkillRubricRepository } from '#modules/skills/infra/repositories/skill_rubric_repository'
import { ProjectSkillRepository } from '#modules/skills/infra/repositories/project_skill_repository'
import { ProfessionalRoleRepository } from '#modules/skills/infra/repositories/professional_role_repository'
```

### `app/modules/skills/actions/services/skill_rubric_service.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { ProficiencyScaleService } from './proficiency_scale_service.js'
import { SkillRubricRepository } from '#modules/skills/infra/repositories/skill_rubric_repository'
```

### `app/modules/skills/controllers/add_project_skill_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ProjectSkillService } from '#modules/skills/actions/services/project_skill_service'
import { checkProjectPermission } from './project_auth_helper.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/skills/controllers/create_project_role_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ProfessionalRoleService } from '#modules/skills/actions/services/professional_role_service'
import { checkProjectPermission } from './project_auth_helper.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/skills/controllers/deactivate_project_role_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ProfessionalRoleService } from '#modules/skills/actions/services/professional_role_service'
import { ProfessionalRoleRepository } from '#modules/skills/infra/repositories/professional_role_repository'
import { checkProjectPermission } from './project_auth_helper.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/skills/controllers/deactivate_project_skill_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ProjectSkillService } from '#modules/skills/actions/services/project_skill_service'
import { checkProjectPermission } from './project_auth_helper.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/skills/controllers/list_active_skills_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import Skill from '#modules/skills/infra/models/skill'
```

### `app/modules/skills/controllers/list_proficiency_scales_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ProficiencyScaleService } from '#modules/skills/actions/services/proficiency_scale_service'
```

### `app/modules/skills/controllers/list_project_roles_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import ProjectProfessionalRole from '#modules/skills/infra/models/project_professional_role'
import { checkProjectPermission } from './project_auth_helper.js'
```

### `app/modules/skills/controllers/list_project_skills_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ProjectSkillService } from '#modules/skills/actions/services/project_skill_service'
import { checkProjectPermission } from './project_auth_helper.js'
```

### `app/modules/skills/controllers/list_role_templates_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import ProfessionalRoleTemplate from '#modules/skills/infra/models/professional_role_template'
```

### `app/modules/skills/controllers/list_skill_rubrics_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { SkillRubricRepository } from '#modules/skills/infra/repositories/skill_rubric_repository'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
```

### `app/modules/skills/controllers/project_auth_helper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { canViewProject, canUpdateProject } from '#modules/projects/domain/project_permission_policy'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { DefaultProjectDependencies } from '#modules/projects/actions/ports/project_external_dependencies_impl'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
```

### `app/modules/skills/controllers/show_proficiency_scale_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ProficiencyScaleService } from '#modules/skills/actions/services/proficiency_scale_service'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
```

### `app/modules/skills/controllers/show_skill_rubric_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { SkillRubricService } from '#modules/skills/actions/services/skill_rubric_service'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
```

### `app/modules/skills/controllers/update_project_role_skill_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ProfessionalRoleService } from '#modules/skills/actions/services/professional_role_service'
import { ProfessionalRoleRepository } from '#modules/skills/infra/repositories/professional_role_repository'
import { checkProjectPermission } from './project_auth_helper.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/skills/controllers/update_project_skill_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ProjectSkillService } from '#modules/skills/actions/services/project_skill_service'
import { ProjectSkillRepository } from '#modules/skills/infra/repositories/project_skill_repository'
import { checkProjectPermission } from './project_auth_helper.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```
## Code Snippets

### `app/modules/skills/actions/services/proficiency_scale_service.ts`

```ts
import { ProficiencyScaleRepository } from '#modules/skills/infra/repositories/proficiency_scale_repository'

export class ProficiencyScaleService {
  /**
   * Get the current active proficiency scale with its levels sorted by ordinal.
   */
  static async getActiveScale() {
    return ProficiencyScaleRepository.getActiveScaleWithLevels()
  }

  /**
   * Map a level code string (e.g. 'junior', 'senior') to its database ProficiencyLevel record.
   */
  static async mapCodeToLevel(code: string) {
    const scale = await this.getActiveScale()
    if (!scale) return null
    return scale.levels.find((l) => l.code === code) ?? null
  }
}

```

### `app/modules/skills/actions/services/skill_rubric_service.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import { ProficiencyScaleService } from './proficiency_scale_service.js'
import { SkillRubricRepository } from '#modules/skills/infra/repositories/skill_rubric_repository'

export class SkillRubricService {
  /**
   * Create a new draft rubric version for a skill.
   */
  static async createDraftVersion(
    skillId: string,
    createdBy?: string,
    changeSummary?: string
  ) {
    const skill = await SkillRubricRepository.findSkill(skillId)
    if (!skill) {
      throw new Error('Skill not found')
    }

    const existingDraft = await SkillRubricRepository.findDraftBySkill(skillId)
    if (existingDraft) {
      throw new Error('Draft version already exists for this skill')
    }

    const maxVersion = await SkillRubricRepository.findMaxVersionBySkill(skillId)
    const nextVersion = maxVersion + 1

    return await SkillRubricRepository.createDraftVersion(skillId, nextVersion, createdBy, changeSummary)
  }

  /**
   * Add or update a rubric level definition in a draft version.
   */
  static async addOrUpdateLevel(
    versionId: string,
    levelId: string,
    payload: Record<string, unknown>
  ) {
    const version = await SkillRubricRepository.findRubricVersion(versionId)
    if (!version) {
      throw new Error('Rubric version not found')
    }

    if (version.status !== 'draft') {
      throw new Error('Cannot modify a published rubric version')
    }

    return await SkillRubricRepository.createOrUpdateLevel(versionId, levelId, payload)
  }

  /**
   * Publish a draft version, making it active and archiving the previous version.
   */
  static async publishVersion(versionId: string) {
    const version = await SkillRubricRepository.findRubricVersion(versionId)
    if (!version) {
      throw new Error('Rubric version not found')
    }

    if (version.status !== 'draft') {
      throw new Error('Version is not in draft status')
    }

    const activeScale = await ProficiencyScaleService.getActiveScale()
    if (!activeScale) {
      throw new Error('No active default proficiency scale found')
    }

    const scaleLevels = activeScale.levels
    const definedLevels = await SkillRubricRepository.findRubricLevelsByVersion(versionId)

    const definedLevelIds = new Set(definedLevels.map((dl) => dl.proficiency_level_id))
    const missingLevels = scaleLevels.filter((sl) => !definedLevelIds.has(sl.id))

    if (missingLevels.length > 0) {
      throw new Error(
        `Incomplete rubric: missing definitions for levels [${missingLevels.map((l) => l.code).join(', ')}]`
      )
    }

    const now = DateTime.now()

    const trx = await db.transaction()
    try {
      version.useTransaction(trx)
      version.status = 'published'
      version.effective_from = now
      await version.save()

      const prevVersions = await SkillRubricRepository.findPublishedVersionsBySkill(
        version.skill_id,
        version.id,
        trx
      )

      for (const prev of prevVersions) {
        prev.useTransaction(trx)
        prev.effective_to = now
        await prev.save()
      }

      await trx.commit()
      return version
    } catch (err) {
      await trx.rollback()
      throw err
    }
  }

  /**
   * Retrieve the current published rubric version for a skill.
   */
  static async getPublishedVersion(skillId: string) {
    return SkillRubricRepository.findPublishedBySkill(skillId)
  }

  /**
   * Resolve a search phrase or input to a canonical Skill entity.
   */
  static async resolveSkill(phrase: string) {
    const trimmed = phrase.trim()
    if (!trimmed) return null

    let skill = await SkillRubricRepository.findActiveSkillByCode(trimmed)
    if (skill) return skill

    skill = await SkillRubricRepository.findActiveSkillByName(trimmed)
    if (skill) return skill

    const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '')
    const alias = await SkillRubricRepository.findAliasByNormalized(normalized)
    if (alias && alias.skill && alias.skill.is_active) {
      return alias.skill
    }

    return null
  }
}

```
