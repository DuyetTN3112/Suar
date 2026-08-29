import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const baselinePath = resolve(root, 'scripts/validation_architecture_baseline.json')
const controllerFiles = [
  'app/modules/sprints/controllers/create_project_sprint_controller.ts',
  'app/modules/sprints/controllers/update_project_sprint_controller.ts',
  'app/modules/sprints/controllers/move_task_to_sprint_controller.ts',
  'app/modules/sprints/controllers/reorder_project_backlog_controller.ts',
  'app/modules/sprints/controllers/end_project_sprint_delivery_controller.ts',
  'app/modules/reviews/controllers/observation/create_review_observation_controller.ts',
  'app/modules/tasks/controllers/task_assignment_interaction_controller.ts',
  'app/modules/organizations/controllers/settings/update_settings_controller.ts',
  'app/modules/settings/controllers/update_notification_settings_controller.ts',
  'app/modules/filtering/controllers/filter_saved_views_controller.ts',
  'app/modules/filtering/controllers/filter_query_controller.ts',
  'app/modules/http/controllers/redis_set_cache_controller.ts',
  'app/modules/http/controllers/redis_get_cache_controller.ts',
  'app/modules/http/controllers/redis_clear_cache_controller.ts',
  'app/modules/http/controllers/redis_flush_cache_controller.ts',
  'app/modules/projects/controllers/get_role_staffing_candidates_controller.ts',
  'app/modules/tasks/controllers/delete_task_controller.ts',
  'app/modules/tasks/controllers/edit_task_controller.ts',
  'app/modules/tasks/controllers/update_task_status_controller.ts',
  'app/modules/tasks/controllers/update_task_time_controller.ts',
  'app/modules/tasks/controllers/update_task_sort_order_controller.ts',
  'app/modules/tasks/controllers/batch_update_task_status_controller.ts',
  'app/modules/tasks/controllers/task_submission_evidence_controller.ts',
  'app/modules/organizations/controllers/members/remove_member_controller.ts',
  'app/modules/skills/controllers/add_project_skill_controller.ts',
  'app/modules/skills/controllers/create_project_role_controller.ts',
  'app/modules/skills/controllers/update_project_skill_controller.ts',
  'app/modules/skills/controllers/deactivate_project_skill_controller.ts',
  'app/modules/skills/controllers/deactivate_project_role_controller.ts',
  'app/modules/skills/controllers/update_project_role_skill_controller.ts',
  'app/modules/users/controllers/update_profile_skill_controller.ts',
  'app/modules/projects/controllers/add_project_member_controller.ts',
  'app/modules/projects/controllers/remove_project_member_controller.ts',
  'app/modules/users/controllers/add_profile_skill_controller.ts',
  'app/modules/admin/packages/controllers/update_package_controller.ts',
  'app/modules/admin/proficiency/controllers/mutate_skill_rubric_controller.ts',
  'app/modules/admin/permissions/controllers/custom_system_role_controller.ts',
  'app/modules/admin/users/controllers/suspend_user_controller.ts',
  'app/modules/admin/users/controllers/update_user_role_controller.ts',
  'app/modules/admin/reviews/controllers/resolve_flagged_review_controller.ts',
  'app/modules/reviews/controllers/ai_dispute_callback_controller.ts',
  'app/modules/reviews/controllers/submit_task_review_workflow_controller.ts',
  'app/modules/reviews/controllers/respond_task_review_workflow_controller.ts',
  'app/modules/reviews/controllers/report_task_review_workflow_controller.ts',
  'app/modules/reviews/controllers/submit_sprint_reverse_review_workflow_controller.ts',
  'app/modules/reviews/controllers/respond_sprint_reverse_review_workflow_controller.ts',
  'app/modules/reviews/controllers/report_sprint_reverse_review_workflow_controller.ts',
  'app/modules/reviews/controllers/close_project_sprint_review_controller.ts',
  'app/modules/reviews/controllers/close_project_sprint_review_period_controller.ts',
  'app/modules/reviews/controllers/expire_sprint_review_packages_controller.ts',
  'app/modules/reviews/controllers/create_sprint_review_dispute_comment_controller.ts',
  'app/modules/reviews/controllers/report_sprint_review_dispute_controller.ts',
  'app/modules/reviews/controllers/submit_sprint_review_package_controller.ts',
  'app/modules/tasks/controllers/task_comment_controller.ts',
  'app/modules/auth/controllers/session_token_controller.ts',
  'app/modules/projects/controllers/project-context/publish_project_context_controller.ts',
  'app/modules/users/controllers/update_profile_discoverability_controller.ts',
  'app/modules/tasks/controllers/v1/add_task_requirement_controller.ts',
  'app/modules/tasks/controllers/v1/update_task_requirement_controller.ts',
  'app/modules/notifications/controllers/delete_notification_controller.ts',
  'app/modules/notifications/controllers/mark_notification_read_controller.ts',
  'app/modules/notifications/controllers/v1/delete_notification_controller.ts',
  'app/modules/notifications/controllers/v1/mark_notification_read_controller.ts',
  'app/modules/marketplace/controllers/apply_marketplace_task_controller.ts',
  'app/modules/marketplace/controllers/process_marketplace_application_controller.ts',
  'app/modules/marketplace/controllers/withdraw_marketplace_application_controller.ts',
  'app/modules/sprints/controllers/start_project_sprint_controller.ts',
  'app/modules/sprints/controllers/show_project_sprint_controller.ts',
  'app/modules/organizations/controllers/access/switch_and_redirect_controller.ts',
  'app/modules/organizations/controllers/access/switch_organization_controller.ts',
  'app/modules/organizations/controllers/invitations/accept_my_invitation_controller.ts',
  'app/modules/organizations/controllers/invitations/reject_my_invitation_controller.ts',
  'app/modules/projects/controllers/switch_project_controller.ts',
  'app/modules/taxonomy/controllers/taxonomy_governance_controller.ts',
  'app/modules/tasks/controllers/update_task_sort_order_controller.ts',
  'app/modules/tasks/controllers/batch_update_task_status_controller.ts',
  'app/modules/tasks/controllers/task_submission_evidence_controller.ts',
  'app/modules/reviews/controllers/build_review_dispute_case_file_controller.ts',
  'app/modules/reviews/controllers/create_review_dispute_evidence_controller.ts',
  'app/modules/reviews/controllers/create_sprint_review_dispute_controller.ts',
  'app/modules/tasks/controllers/v1/remove_task_requirement_controller.ts',
  'app/modules/organizations/controllers/members/approve_pending_member_controller.ts',
  'app/modules/tasks/controllers/task_submission_controller.ts',
  'app/modules/http/controllers/admin_search_projection_controller.ts',
  'app/modules/http/controllers/search_api_controller.ts',
  'app/modules/marketplace/controllers/marketplace_match_scores_controller.ts',
  'app/modules/http/controllers/search_page_controller.ts',
  'app/modules/marketplace/controllers/list_marketplace_task_applications_controller.ts',
  'app/modules/admin/disputes/controllers/admin_disputes_controller.ts',
  'app/modules/admin/reviews/controllers/list_flagged_reviews_controller.ts',
  'app/modules/admin/users/controllers/list_users_controller.ts',
  'app/modules/reviews/controllers/list_admin_review_disputes_controller.ts',
  'app/modules/reviews/controllers/show_sprint_reverse_review_board_controller.ts',
  'app/modules/sprints/controllers/get_project_backlog_controller.ts',
  'app/modules/sprints/controllers/list_project_sprints_controller.ts',
  'app/modules/filtering/controllers/filter_contexts_controller.ts',
  'app/modules/reviews/controllers/get_review_evidences_controller.ts',
  'app/modules/reviews/controllers/list_pending_sprint_review_packages_controller.ts',
  'app/modules/reviews/controllers/list_sprint_review_packages_controller.ts',
  'app/modules/users/controllers/my_invitations_page_controller.ts',
  'app/modules/projects/controllers/list_project_member_candidates_controller.ts',
  'app/modules/http/controllers/get_organization_members_api_controller.ts',
  'app/modules/http/controllers/redis_list_keys_controller.ts',
  'app/modules/users/controllers/talents_search_controller.ts',
  'app/modules/notifications/controllers/notification-feed/list_notifications_controller.ts',
  'app/modules/notifications/controllers/notification-feed/v1/list_notifications_controller.ts',
  'app/modules/notifications/controllers/notification-feed/latest_notifications_controller.ts',
  'app/modules/organizations/controllers/directory/all_organizations_controller.ts',
  'app/modules/organizations/controllers/directory/api_list_organizations_controller.ts',
  'app/modules/organizations/controllers/directory/show_organization_controller.ts',
  'app/modules/reviews/controllers/list_org_review_disputes_controller.ts',
  'app/modules/reviews/controllers/show_task_review_board_controller.ts',
  'app/modules/skills/controllers/list_active_skills_controller.ts',
  'app/modules/sprints/controllers/get_sprint_board_controller.ts',
  'app/modules/organizations/controllers/invitations/list_join_requests_controller.ts',
  'app/modules/organizations/controllers/projects/show_project_controller.ts',
  'app/modules/organizations/controllers/tasks/list_tasks_controller.ts',
  'app/modules/users/controllers/org_bookmarks_page_controller.ts',
  'app/modules/tasks/controllers/task-authoring/check_create_permission_controller.ts',
  'app/modules/errors/controllers/error_controller.ts',
  'app/modules/admin/dashboard/controllers/dashboard_controller.ts',
  'app/modules/admin/packages/controllers/list_packages_controller.ts',
  'app/modules/reviews/controllers/accept_task_review_workflow_controller.ts',
]

const violations = []
const uniqueControllerFiles = [...new Set(controllerFiles)]
const missingControllerFiles = []
const controllerPathAliases = new Map([
  ['app/modules/users/controllers/update_profile_skill_controller.ts', 'app/modules/users/controllers/profile-skills/update_profile_skill_controller.ts'],
  ['app/modules/users/controllers/add_profile_skill_controller.ts', 'app/modules/users/controllers/profile-skills/add_profile_skill_controller.ts'],
  ['app/modules/sprints/controllers/create_project_sprint_controller.ts', 'app/modules/sprints/controllers/project-sprint/create_project_sprint_controller.ts'],
  ['app/modules/sprints/controllers/update_project_sprint_controller.ts', 'app/modules/sprints/controllers/project-sprint/update_project_sprint_controller.ts'],
  ['app/modules/sprints/controllers/reorder_project_backlog_controller.ts', 'app/modules/sprints/controllers/project-backlog/reorder_project_backlog_controller.ts'],
  ['app/modules/sprints/controllers/end_project_sprint_delivery_controller.ts', 'app/modules/sprints/controllers/project-sprint/end_project_sprint_delivery_controller.ts'],
  ['app/modules/settings/controllers/update_notification_settings_controller.ts', 'app/modules/settings/controllers/notification-settings/update_notification_settings_controller.ts'],
  ['app/modules/marketplace/controllers/apply_marketplace_task_controller.ts', 'app/modules/marketplace/controllers/marketplace-application/apply_marketplace_task_controller.ts'],
  ['app/modules/marketplace/controllers/process_marketplace_application_controller.ts', 'app/modules/marketplace/controllers/marketplace-application/process_marketplace_application_controller.ts'],
  ['app/modules/marketplace/controllers/withdraw_marketplace_application_controller.ts', 'app/modules/marketplace/controllers/marketplace-application/withdraw_marketplace_application_controller.ts'],
  ['app/modules/sprints/controllers/start_project_sprint_controller.ts', 'app/modules/sprints/controllers/project-sprint/start_project_sprint_controller.ts'],
  ['app/modules/sprints/controllers/show_project_sprint_controller.ts', 'app/modules/sprints/controllers/project-sprint/show_project_sprint_controller.ts'],
  ['app/modules/marketplace/controllers/marketplace_match_scores_controller.ts', 'app/modules/marketplace/controllers/marketplace-application/marketplace_match_scores_controller.ts'],
  ['app/modules/http/controllers/search_page_controller.ts', 'app/modules/http/controllers/search-discovery/search_page_controller.ts'],
  ['app/modules/marketplace/controllers/list_marketplace_task_applications_controller.ts', 'app/modules/marketplace/controllers/marketplace-application/list_marketplace_task_applications_controller.ts'],
  ['app/modules/sprints/controllers/get_project_backlog_controller.ts', 'app/modules/sprints/controllers/project-backlog/get_project_backlog_controller.ts'],
  ['app/modules/sprints/controllers/list_project_sprints_controller.ts', 'app/modules/sprints/controllers/project-sprint/list_project_sprints_controller.ts'],
])

function methodSources(source) {
  const methods = []
  const declaration = /async\s+([A-Za-z0-9_]+)\s*\([^)]*\)(?:\s*:[^{]+)?\s*\{/g
  for (const match of source.matchAll(declaration)) {
    const openBrace = match.index + match[0].lastIndexOf('{')
    let depth = 0
    let quote = ''
    let escaped = false
    for (let index = openBrace; index < source.length; index += 1) {
      const character = source[index]
      if (quote) {
        if (escaped) escaped = false
        else if (character === '\\') escaped = true
        else if (character === quote) quote = ''
        continue
      }
      if (character === '"' || character === "'" || character === '`') {
        quote = character
        continue
      }
      if (character === '{') depth += 1
      if (character === '}' && --depth === 0) {
        methods.push({ name: match[1], source: source.slice(openBrace + 1, index) })
        break
      }
    }
  }
  return methods
}

for (const requestedPath of uniqueControllerFiles) {
  const relativePath = controllerPathAliases.get(requestedPath) ?? requestedPath
  let source
  try {
    source = await readFile(resolve(root, relativePath), 'utf8')
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    missingControllerFiles.push(relativePath)
    continue
  }
  for (const method of methodSources(source)) {
    const hasPayloadInput =
      /request\.(body|all|only|qs|file)\s*\(/.test(method.source) ||
      /request\.input\(\s*['"](?!redirect_to['"])[^'"]+['"]/.test(method.source)
    const hasRouteInput = /params\[['"][^'"]+['"]\]/.test(method.source)
    const hasPayloadMapper = /(?:build[A-Z][A-Za-z0-9_]*|validateUsing)\s*\(/.test(method.source)
    const hasRouteMapper = /(?:build[A-Z][A-Za-z0-9_]*|requireRouteParam|validateUsing)\s*\(/.test(
      method.source
    )
    if ((hasPayloadInput && !hasPayloadMapper) || (hasRouteInput && !hasRouteMapper)) {
      violations.push({
        rule: 'controller.request_mapper_required',
        file: relativePath,
        detail: `${method.name} action boundary (${hasPayloadInput ? 'payload' : 'route'})`,
      })
    }

    const intentCalls = method.source.match(/\.make[A-Z][A-Za-z0-9_]*\s*\(/g) ?? []
    if (intentCalls.length > 1) {
      violations.push({
        rule: 'controller.single_application_intent',
        file: relativePath,
        detail: `${method.name}: ${intentCalls.length} factory intents`,
      })
    }
  }
}

const baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
const accepted = new Set(Array.isArray(baseline.accepted) ? baseline.accepted : [])
const violationKey = (violation) =>
  `${violation.rule}:${violation.file}:${violation.detail ?? ''}`
const newViolations = violations.filter((violation) => !accepted.has(violationKey(violation)))

if (newViolations.length > 0) {
  for (const violation of newViolations) {
    console.error(
      `[validation-architecture][VIOLATION] ${violation.rule} ${violation.file}${
        violation.detail ? ` (${violation.detail})` : ''
      }`
    )
  }
  process.exitCode = 1
} else {
  console.log(
      `[validation-architecture][OK] Checked ${uniqueControllerFiles.length} migrated controllers; ` +
      `${violations.length} baseline violation(s) accepted` +
      (missingControllerFiles.length > 0
        ? `; skipped ${missingControllerFiles.length} missing/moved files: ${missingControllerFiles.join(', ')}`
        : '')
  )
}
