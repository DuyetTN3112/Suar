/**
 * Integration | Create Task Test Suite Aggregator
 *
 * Deconstructed following Clean Code and SOLID principles:
 * - create_task_draft_operational.spec.ts: Draft authoring, docs items, idempotency retry, work contract publication
 * - create_task_transactions_invariants.spec.ts: Revision rollback, org invariants, audit logs, notification staging
 * - create_task_permissions_validation.spec.ts: User status, permissions, foreign projects, assignee boundaries, due dates
 */

import './create_task_draft_operational.spec.js'
import './create_task_transactions_invariants.spec.js'
import './create_task_permissions_validation.spec.js'
