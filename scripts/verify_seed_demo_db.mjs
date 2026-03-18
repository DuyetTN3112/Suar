#!/usr/bin/env node
/**
 * Read-only verification of the demo seed on the configured PostgreSQL database.
 *
 * Usage:
 *   node scripts/verify_seed_demo_db.mjs
 *
 * Reads PG_* from .env. Never writes. Exits non-zero when a demo-critical
 * expectation fails, and prints a readable PASS/FAIL report.
 */
import fs from 'node:fs'
import path from 'node:path'

import pg from 'pg'

const MAIN_EMAIL = 'tranngocduyet31@gmail.com'
const PRIMARY_ORG = 'Suar Product Studio'
const SECONDARY_ORG = 'Học viện Kỹ năng Số Mở'
const MINIMUM_ENTITY_COUNTS = {
  users: 24,
  organizations: 10,
  projects: 25,
  tasks: 296,
  notifications: 30,
  audit_events: 32,
}
const ALLOWED_DECISIONS = [
  'uphold_review',
  'adjust_score',
  'request_re_review',
  'dismiss_dispute',
  'partially_accept',
]
const CANONICAL_TASK_STATUS_SLUGS = [
  'cancelled',
  'done',
  'done_dev',
  'in_progress',
  'in_testing',
  'rejected',
  'todo',
]
const BANNED_COPY = /(?:\bseed(?:ed|ing)?\b|\bdemo-only\b|\borg [a-e]\b|\b(?:owner|member)-[a-z0-9-]+\b|\.local\b)/i

for (const rawLine of fs.readFileSync(path.resolve('.env'), 'utf8').split('\n')) {
  const line = rawLine.trim()
  if (!line || line.startsWith('#')) continue
  const separatorIndex = line.indexOf('=')
  if (separatorIndex <= 0) continue
  const key = line.slice(0, separatorIndex).trim()
  let value = line.slice(separatorIndex + 1).trim()
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }
  process.env[key] ??= value
}

const client = new pg.Client({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT ?? '5432'),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD ?? '',
  database: process.env.PG_DATABASE,
})

const results = []
let failed = 0

function report(name, ok, detail = '') {
  results.push({ name, ok, detail })
  if (!ok) failed += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function one(sql, params = []) {
  const { rows } = await client.query(sql, params)
  return rows[0] ?? null
}

async function num(sql, params = []) {
  const row = await one(sql, params)
  const value = row ? Object.values(row)[0] : 0
  return Number(value ?? 0)
}

await client.connect()
const dbRow = await one('select current_database() as db')
console.log(`Database: ${dbRow.db}\n`)

// 1. Central account
const mainUser = await one(
  'select id, username, system_role, status, current_organization_id from users where email = $1',
  [MAIN_EMAIL]
)
report('Tài khoản chính tồn tại', Boolean(mainUser), mainUser?.username ?? 'không tìm thấy')

if (mainUser) {
  const memberships = (
    await client.query(
      `select o.name, ou.org_role, ou.status
         from organization_users ou join organizations o on o.id = ou.organization_id
        where ou.user_id = $1 order by o.name`,
      [mainUser.id]
    )
  ).rows
  const approved = memberships.filter((m) => m.status === 'approved')
  report(
    'Membership approved đủ cho các câu chuyện liên tổ chức',
    approved.length >= 2,
    approved.map((m) => `${m.name}:${m.org_role}`).join(', ')
  )
  report(
    `org_owner tại "${PRIMARY_ORG}"`,
    approved.some((m) => m.name === PRIMARY_ORG && m.org_role === 'org_owner')
  )
  report(
    `org_member tại "${SECONDARY_ORG}"`,
    approved.some((m) => m.name === SECONDARY_ORG && m.org_role === 'org_member')
  )

  const currentOrg = await one('select name from organizations where id = $1', [
    mainUser.current_organization_id,
  ])
  report('current_organization là org sở hữu', currentOrg?.name === PRIMARY_ORG, currentOrg?.name)

  const provider = await one(
    'select provider, provider_id from user_oauth_providers where user_id = $1 order by (provider_id like $2) asc limit 1',
    [mainUser.id, 'seed-%']
  )
  report(
    'OAuth identity của tài khoản chính',
    Boolean(provider),
    provider ? `${provider.provider} (${provider.provider_id.startsWith('seed-') ? 'generated' : 'real'})` : ''
  )

  // Profile richness
  const workHistory = await num('select count(*) from user_work_history where user_id = $1', [
    mainUser.id,
  ])
  const userSkills = await num('select count(*) from user_skills where user_id = $1', [mainUser.id])
  const perfStats = await num('select count(*) from user_performance_stats where user_id = $1', [
    mainUser.id,
  ])
  const domainExpertise = await num(
    'select count(*) from user_domain_expertise where user_id = $1',
    [mainUser.id]
  )
  const publicSnapshot = await num(
    'select count(*) from user_profile_snapshots where user_id = $1 and is_public = true',
    [mainUser.id]
  )
  const completedAssignments = await num(
    `select count(*) from task_assignments
      where assignee_id = $1 and assignment_status = 'completed'`,
    [mainUser.id]
  )
  report(
    'Hồ sơ: mỗi assignment hoàn thành có đúng một work history',
    workHistory === completedAssignments,
    `${workHistory}/${completedAssignments}`
  )
  report('Hồ sơ: user skills ≥ 10', userSkills >= 10, String(userSkills))
  report('Hồ sơ: performance stats', perfStats > 0)
  report('Hồ sơ: domain expertise', domainExpertise > 0)
  report('Hồ sơ: snapshot công khai', publicSnapshot > 0)
}

// 2. Entity volume
const counts = {}
for (const table of [
  'users',
  'organizations',
  'projects',
  'project_sprints',
  'tasks',
  'task_assignments',
  'task_submissions',
  'review_sessions',
  'skill_reviews',
  'review_disputes',
  'review_dispute_case_files',
  'ai_dispute_evaluations',
  'task_review_workflows',
  'sprint_reverse_review_workflows',
  'sprint_review_disputes',
  'notifications',
  'audit_events',
]) {
  counts[table] = await num(`select count(*) from ${table}`)
}
console.log('\nEntity counts:', JSON.stringify(counts))
report(
  `users ≥ ${MINIMUM_ENTITY_COUNTS.users}`,
  counts.users >= MINIMUM_ENTITY_COUNTS.users,
  String(counts.users)
)
report(
  `organizations ≥ ${MINIMUM_ENTITY_COUNTS.organizations}`,
  counts.organizations >= MINIMUM_ENTITY_COUNTS.organizations,
  String(counts.organizations)
)
report(
  `projects ≥ ${MINIMUM_ENTITY_COUNTS.projects}`,
  counts.projects >= MINIMUM_ENTITY_COUNTS.projects,
  String(counts.projects)
)
report('sprints ≥ 3', counts.project_sprints >= 3, String(counts.project_sprints))
report(
  `tasks ≥ ${MINIMUM_ENTITY_COUNTS.tasks}`,
  counts.tasks >= MINIMUM_ENTITY_COUNTS.tasks,
  String(counts.tasks)
)
report('review_sessions ≥ 12', counts.review_sessions >= 12, String(counts.review_sessions))
report('review_disputes ≥ 3', counts.review_disputes >= 3, String(counts.review_disputes))
report(
  `notifications ≥ ${MINIMUM_ENTITY_COUNTS.notifications}`,
  counts.notifications >= MINIMUM_ENTITY_COUNTS.notifications,
  String(counts.notifications)
)
report(
  `audit_events ≥ ${MINIMUM_ENTITY_COUNTS.audit_events}`,
  counts.audit_events >= MINIMUM_ENTITY_COUNTS.audit_events,
  String(counts.audit_events)
)

// 3. Relationship integrity
const usersMissingSkillProfiles = await num(
  `select count(*)
     from users u
    where (
      select count(distinct us.skill_id)
        from user_skills us
       where us.user_id = u.id
    ) < 4`
)
const usersMissingPerformanceAggregate = await num(
  `select count(*)
     from users u
    where not exists (
      select 1
        from user_performance_stats ups
       where ups.user_id = u.id
         and ups.period_start is null
         and ups.period_end is null
    )`
)
const usersMissingDomainExpertise = await num(
  `select count(*)
     from users u
    where not exists (
      select 1
        from user_domain_expertise ude
       where ude.user_id = u.id
    )`
)
const usersMissingCurrentSnapshot = await num(
  `select count(*)
     from users u
    where not exists (
      select 1
        from user_profile_snapshots ups
       where ups.user_id = u.id
         and ups.is_current = true
    )`
)
report(
  'Mọi user có ít nhất 4 kỹ năng',
  usersMissingSkillProfiles === 0,
  String(usersMissingSkillProfiles)
)
report(
  'Mọi user có performance aggregate toàn kỳ',
  usersMissingPerformanceAggregate === 0,
  String(usersMissingPerformanceAggregate)
)
report(
  'Mọi user có domain expertise',
  usersMissingDomainExpertise === 0,
  String(usersMissingDomainExpertise)
)
report(
  'Mọi user có profile snapshot hiện hành',
  usersMissingCurrentSnapshot === 0,
  String(usersMissingCurrentSnapshot)
)

const projectsWithInsufficientMembers = await num(
  `select count(*)
     from (
       select p.id
         from projects p
         left join project_members pm on pm.project_id = p.id
        group by p.id
       having count(distinct pm.user_id) < 2
     ) gaps`
)
const projectsWithInsufficientSkills = await num(
  `select count(*)
     from (
       select p.id
         from projects p
         left join project_skills ps
           on ps.project_id = p.id
          and ps.is_active = true
        group by p.id
       having count(distinct ps.skill_id) < 4
     ) gaps`
)
const projectsWithInvalidLeaders = await num(
  `select count(*)
     from projects p
    where not exists (
      select 1
        from organization_users ou
       where ou.organization_id = p.organization_id
         and ou.user_id = p.creator_id
         and ou.status = 'approved'
    )
       or not exists (
      select 1
        from organization_users ou
       where ou.organization_id = p.organization_id
         and ou.user_id = p.owner_id
         and ou.status = 'approved'
    )
       or not exists (
      select 1
        from organization_users ou
       where ou.organization_id = p.organization_id
         and ou.user_id = p.manager_id
         and ou.status = 'approved'
    )`
)
report(
  'Mọi project có ít nhất 2 thành viên',
  projectsWithInsufficientMembers === 0,
  String(projectsWithInsufficientMembers)
)
report(
  'Mọi project có catalog ít nhất 4 kỹ năng',
  projectsWithInsufficientSkills === 0,
  String(projectsWithInsufficientSkills)
)
report(
  'Creator/owner/manager của project đều là thành viên org đã duyệt',
  projectsWithInvalidLeaders === 0,
  String(projectsWithInvalidLeaders)
)

const invalidStatusOrganizations = await num(
  `select count(*)
     from organizations o
     left join lateral (
       select count(*)::int as status_count,
              array_agg(ts.slug::text order by ts.slug) as status_slugs
         from task_statuses ts
        where ts.organization_id = o.id
     ) status_graph on true
     left join lateral (
       select count(*)::int as transition_count
         from task_workflow_transitions twt
         join task_statuses from_status on from_status.id = twt.from_status_id
         join task_statuses to_status on to_status.id = twt.to_status_id
        where from_status.organization_id = o.id
          and to_status.organization_id = o.id
     ) transitions on true
    where status_graph.status_count <> 7
       or status_graph.status_slugs <> $1::text[]
       or transitions.transition_count <> 14`,
  [CANONICAL_TASK_STATUS_SLUGS]
)
report(
  'Mỗi tổ chức có status graph production 7 trạng thái / 14 chuyển tiếp',
  invalidStatusOrganizations === 0,
  String(invalidStatusOrganizations)
)

const taskStatusMirrorMismatches = await num(
  `select count(*)
     from tasks t
     join task_statuses ts on ts.id = t.task_status_id
    where t.status::text <> ts.category::text`
)
report(
  'tasks.status phản chiếu đúng category của task_status_id',
  taskStatusMirrorMismatches === 0,
  String(taskStatusMirrorMismatches)
)

const duplicateTaskTitles = await num(
  `select count(*)
     from (
       select title
         from tasks
        group by title
       having count(*) > 1
     ) duplicates`
)
const tasksBelowRequiredSkillCoverage = await num(
  `select count(*)
     from (
       select t.id, count(distinct s.category_code) as category_count
         from tasks t
         left join task_required_skills trs on trs.task_id = t.id
         left join skills s on s.id = trs.skill_id
        group by t.id
     ) coverage
    where category_count < 4`
)
const narrativelyIncompleteTasks = await num(
  `select count(*)
     from tasks
    where length(trim(description)) < 80
       or length(trim(acceptance_criteria)) < 80
       or jsonb_array_length(expected_deliverables) < 2
       or jsonb_array_length(measurable_outcomes) < 1`
)
report('Task title không lặp', duplicateTaskTitles === 0, String(duplicateTaskTitles))
report(
  'Mỗi task phủ đủ 4 nhóm kỹ năng bắt buộc',
  tasksBelowRequiredSkillCoverage === 0,
  String(tasksBelowRequiredSkillCoverage)
)
report(
  'Mỗi task có narrative, tiêu chí, deliverable và outcome đủ dùng để demo',
  narrativelyIncompleteTasks === 0,
  String(narrativelyIncompleteTasks)
)

const orphanAssignments = await num(
  `select count(*) from task_assignments ta
    left join tasks t on t.id = ta.task_id
    left join users u on u.id = ta.assignee_id
   where t.id is null or u.id is null`
)
report('Assignment không mồ côi', orphanAssignments === 0, String(orphanAssignments))

const assignmentAssigneeMismatches = await num(
  `select count(*)
     from tasks t
     join task_assignments ta on ta.task_id = t.id
    where t.assigned_to is distinct from ta.assignee_id`
)
report(
  'Task assignee đồng bộ với assignment',
  assignmentAssigneeMismatches === 0,
  String(assignmentAssigneeMismatches)
)

const assignmentsWithoutSubmission = await num(
  `select count(*) from task_assignments ta
    left join task_submissions ts on ts.task_assignment_id = ta.id
   where ts.id is null`
)
report(
  'Mọi assignment có submission',
  assignmentsWithoutSubmission === 0,
  String(assignmentsWithoutSubmission)
)

const completedAssignmentsWithoutWorkHistory = await num(
  `select count(*)
     from task_assignments ta
     left join user_work_history uwh
       on uwh.task_assignment_id = ta.id
      and uwh.user_id = ta.assignee_id
    where ta.assignment_status = 'completed'
      and uwh.id is null`
)
report(
  'Assignment hoàn thành materialize vào work history',
  completedAssignmentsWithoutWorkHistory === 0,
  String(completedAssignmentsWithoutWorkHistory)
)

const invalidApprovedApplications = await num(
  `select count(*)
     from task_applications app
     join tasks t on t.id = app.task_id
     left join task_assignments ta
       on ta.task_id = app.task_id
      and ta.assignee_id = app.applicant_id
     left join organization_users ou
       on ou.organization_id = t.organization_id
      and ou.user_id = app.applicant_id
    where app.application_status = 'approved'
      and (
        ta.id is null
        or t.assigned_to is distinct from app.applicant_id
        or ou.status is distinct from 'approved'
      )`
)
report(
  'Marketplace approval tạo membership + assignment + task assignee',
  invalidApprovedApplications === 0,
  String(invalidApprovedApplications)
)

const doneTasksWithoutReviewWorkflow = await num(
  `select count(*)
     from tasks t
     join task_statuses ts on ts.id = t.task_status_id
     left join task_review_workflows trw on trw.task_id = t.id
    where ts.slug = 'done'
      and trw.id is null`
)
report(
  'Task done mở task-review workflow',
  doneTasksWithoutReviewWorkflow === 0,
  String(doneTasksWithoutReviewWorkflow)
)

const invalidTaskReviewers = await num(
  `select count(*)
     from task_review_reviewers trr
     join task_review_workflows trw on trw.id = trr.workflow_id
    where trr.reviewer_id = trw.reviewee_id`
)
report('Task review không tự đánh giá', invalidTaskReviewers === 0, String(invalidTaskReviewers))

const disputesMissingParts = await num(
  `select count(distinct rd.id) from review_disputes rd
    left join review_dispute_case_files cf on cf.dispute_id = rd.id
    left join ai_dispute_evaluations ae on ae.dispute_id = rd.id
    left join review_dispute_evidences ev on ev.dispute_id = rd.id
   where cf.id is null or ae.id is null or ev.id is null`
)
report(
  'Mỗi dispute đủ case file + AI eval + evidence',
  disputesMissingParts === 0,
  String(disputesMissingParts)
)

const incompleteCaseFiles = await num(
  'select count(*) from review_dispute_case_files where completeness_score < 100'
)
report('Case file completeness = 100', incompleteCaseFiles === 0, String(incompleteCaseFiles))

const invalidDecisions = await num(
  `select
     (select count(*) from review_disputes where final_decision is not null and final_decision <> all($1::text[]))
   + (select count(*) from task_review_workflows where final_decision is not null and final_decision <> all($1::text[]))
   + (select count(*) from sprint_review_disputes where final_decision is not null and final_decision <> all($1::text[]))
   + (select count(*) from sprint_reverse_review_workflows where final_decision is not null and final_decision <> all($1::text[]))`,
  [ALLOWED_DECISIONS]
)
report('final_decision đúng enum trên 4 bảng dispute', invalidDecisions === 0, String(invalidDecisions))

const badNotifications = await num(
  `select count(*) from notifications
    where (is_read = false and read_at is not null) or (is_read = true and read_at is null)`
)
report('Notification read state nhất quán', badNotifications === 0, String(badNotifications))

const notificationSideEffects = await one(
  `select
     (select count(*)::int from notifications) as notifications,
     (select count(*)::int from notification_acceptance_ledger) as ledger,
     (select count(*)::int from notification_recipient_states) as recipient_states,
     (select count(*)::int from notification_outbox) as outbox,
     (select count(*)::int
        from notifications n
        left join notification_recipient_states nrs on nrs.recipient_id = n.user_id
       where nrs.recipient_id is null) as missing_recipient_states,
     (select count(*)::int
        from notification_recipient_states nrs
       where nrs.unread_count <> (
         select count(*)
           from notifications n
          where n.user_id = nrs.recipient_id
            and n.is_read = false
       )) as invalid_recipient_states`
)
report(
  'Notification canonical có ledger + recipient state + 2 outbox jobs',
  notificationSideEffects &&
    notificationSideEffects.ledger === notificationSideEffects.notifications &&
    notificationSideEffects.recipient_states > 0 &&
    notificationSideEffects.outbox === notificationSideEffects.notifications * 2 &&
    notificationSideEffects.missing_recipient_states === 0 &&
    notificationSideEffects.invalid_recipient_states === 0,
  notificationSideEffects
    ? `${notificationSideEffects.notifications}/${notificationSideEffects.ledger}/${notificationSideEffects.recipient_states}/${notificationSideEffects.outbox}`
    : ''
)

const invalidAuditChain = await num(
  `with ordered as (
     select id,
            event_hash,
            prev_hash,
            row_number() over (order by occurred_at, id) as position,
            lag(event_hash) over (order by occurred_at, id) as expected_prev_hash
       from audit_events
   )
   select count(*)
     from ordered
    where event_hash is null
       or (position = 1 and prev_hash is not null)
       or (position > 1 and prev_hash is distinct from expected_prev_hash)`
)
const auditEventsWithoutScopes = await num(
  `select count(*)
     from audit_events ae
     left join audit_event_scopes aes on aes.event_id = ae.id
    where aes.event_id is null`
)
report(
  'Audit events tạo chuỗi hash liên tục',
  invalidAuditChain === 0,
  String(invalidAuditChain)
)
report(
  'Mọi audit event có scope truy vấn',
  auditEventsWithoutScopes === 0,
  String(auditEventsWithoutScopes)
)

const badTimeline = await num(
  `select
     (select count(*) from task_assignments where completed_at is not null and completed_at < assigned_at)
   + (select count(*) from task_submissions ts join task_assignments ta on ta.id = ts.task_assignment_id
       where ts.submitted_at is not null and ts.submitted_at < ta.assigned_at)
   + (select count(*) from review_disputes where resolved_at is not null and resolved_at < created_at)`
)
report('Mốc thời gian theo đúng trình tự', badTimeline === 0, String(badTimeline))

// 4. Visible copy scan (no internal/test language)
let copyViolations = 0
const copySources = [
  ['users', 'username'],
  ['users', 'bio'],
  ['organizations', 'name'],
  ['organizations', 'description'],
  ['projects', 'name'],
  ['projects', 'description'],
  ['project_sprints', 'name'],
  ['project_sprints', 'goal'],
  ['tasks', 'title'],
  ['tasks', 'description'],
  ['skills', 'description'],
  ['task_statuses', 'description'],
  ['task_submissions', 'summary'],
  ['notifications', 'title'],
  ['notifications', 'message'],
  ['review_disputes', 'dispute_reason'],
  ['review_disputes', 'final_rationale'],
]
for (const [table, column] of copySources) {
  const { rows } = await client.query(
    `select ${column} as text from ${table} where ${column} is not null`
  )
  for (const row of rows) {
    if (typeof row.text === 'string' && BANNED_COPY.test(row.text)) {
      copyViolations += 1
      console.log(`  copy leak: ${table}.${column}: ${row.text.slice(0, 120)}`)
    }
  }
}
const { rows: tagRows } = await client.query('select domain_tags from tasks')
for (const row of tagRows) {
  const tags = Array.isArray(row.domain_tags) ? row.domain_tags : []
  for (const tag of tags) {
    if (typeof tag === 'string' && BANNED_COPY.test(tag)) {
      copyViolations += 1
      console.log(`  copy leak: tasks.domain_tags: ${tag}`)
    }
  }
}
report('Không lộ ngôn ngữ nội bộ trong copy hiển thị', copyViolations === 0, String(copyViolations))

await client.end()

console.log(`\n${failed === 0 ? '✅ TẤT CẢ ĐẠT' : `❌ ${failed} kiểm tra THẤT BẠI`} (${results.length} kiểm tra)`)
process.exit(failed === 0 ? 0 : 1)
