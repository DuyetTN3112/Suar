import router from '@adonisjs/core/services/router'

const ListProficiencyScalesController = () => import('#modules/skills/controllers/list_proficiency_scales_controller')
const ShowProficiencyScaleController = () => import('#modules/skills/controllers/show_proficiency_scale_controller')
const ListSkillRubricsController = () => import('#modules/skills/controllers/list_skill_rubrics_controller')
const ShowSkillRubricController = () => import('#modules/skills/controllers/show_skill_rubric_controller')
import { middleware } from '#start/kernel'

const GetRoleStaffingCandidatesController = () =>
  import('#modules/projects/controllers/get_role_staffing_candidates_controller')
const GetRoleRequirementsController = () =>
  import('#modules/tasks/controllers/v1/get_role_requirements_controller')

router
  .group(() => {
    // Proficiency scales
    router.get('/proficiency-scales', [ListProficiencyScalesController, 'handle']).as('skills.proficiency_scales.index')
    router.get('/proficiency-scales/:id', [ShowProficiencyScaleController, 'handle']).as('skills.proficiency_scales.show')

    // Skill rubrics
    router.get('/skills/:skillId/rubric', [ShowSkillRubricController, 'handle']).as('skills.rubrics.show')
    router.get('/skills/:skillId/rubrics', [ListSkillRubricsController, 'handle']).as('skills.rubrics.index')

    // Global active skills and templates
    router.get('/skills', [() => import('#modules/skills/controllers/list_active_skills_controller'), 'handle']).as('skills.list_active')
    router.get('/professional-role-templates', [() => import('#modules/skills/controllers/list_role_templates_controller'), 'handle']).as('skills.role_templates.list_active')

    // Project skills catalog routes
    router
      .group(() => {
        router.get('/', [() => import('#modules/skills/controllers/list_project_skills_controller'), 'handle']).as('projects.skills.index')
        router.post('/', [() => import('#modules/skills/controllers/add_project_skill_controller'), 'handle']).as('projects.skills.store')
        router.put('/:projectSkillId', [() => import('#modules/skills/controllers/update_project_skill_controller'), 'handle']).as('projects.skills.update')
        router.delete('/:projectSkillId', [() => import('#modules/skills/controllers/deactivate_project_skill_controller'), 'handle']).as('projects.skills.destroy')
      })
      .prefix('/projects/:projectId/skills')
      .use([middleware.auth(), middleware.requireOrg()])

    // Project professional roles routes
    router
      .group(() => {
        router.get('/', [() => import('#modules/skills/controllers/list_project_roles_controller'), 'handle']).as('projects.roles.index')
        router.post('/', [() => import('#modules/skills/controllers/create_project_role_controller'), 'handle']).as('projects.roles.store')
        router.put('/:roleId/skills/:roleSkillId', [() => import('#modules/skills/controllers/update_project_role_skill_controller'), 'handle']).as('projects.roles.skills.update')
        router.post('/:roleId/skills', [() => import('#modules/skills/controllers/update_project_role_skill_controller'), 'handle']).as('projects.roles.skills.store')
        router.delete('/:roleId/skills/:roleSkillId', [() => import('#modules/skills/controllers/deactivate_project_role_controller'), 'handle']).as('projects.roles.skills.destroy')
        router.delete('/:roleId', [() => import('#modules/skills/controllers/deactivate_project_role_controller'), 'handle']).as('projects.roles.destroy')
        router.get('/:roleId/candidates', [GetRoleStaffingCandidatesController, 'handle']).as('projects.roles.candidates')
        router.get('/:roleId/requirements', [GetRoleRequirementsController, 'handle']).as('projects.roles.requirements')
      })
      .prefix('/projects/:projectId/professional-roles')
      .use([middleware.auth(), middleware.requireOrg()])
  })
  .prefix('/api/v1')
  .as('api.v1.skills')

// Task skill requirements
router
  .group(() => {
    router
      .get('/', [() => import('#modules/tasks/controllers/v1/list_task_requirements_controller'), 'handle'])
      .as('tasks.requirements.index')
    router
      .post('/', [() => import('#modules/tasks/controllers/v1/add_task_requirement_controller'), 'handle'])
      .as('tasks.requirements.store')
    router
      .post('/prefill-from-role', [() => import('#modules/tasks/controllers/v1/prefill_task_requirements_from_role_controller'), 'handle'])
      .as('tasks.requirements.prefill')
    router
      .get('/versions', [() => import('#modules/tasks/controllers/v1/list_task_requirement_versions_controller'), 'handle'])
      .as('tasks.requirements.versions')
    router
      .put('/:requirementId', [() => import('#modules/tasks/controllers/v1/update_task_requirement_controller'), 'handle'])
      .as('tasks.requirements.update')
    router
      .delete('/:requirementId', [() => import('#modules/tasks/controllers/v1/remove_task_requirement_controller'), 'handle'])
      .as('tasks.requirements.destroy')
  })
  .prefix('/api/v1/tasks/:taskId/requirements')
  .use([middleware.auth(), middleware.requireOrg()])
  .as('api.v1.tasks.requirements')
