/**
 * Modular Aggregator for Admin Audit Logs Integration Tests.
 *
 * Decomposed in accordance with Clean Code (Robert C. Martin - Function, Class, Test chapters)
 * and SOLID principles (Single Responsibility Principle).
 *
 * Sub-suites:
 * - audit_logs_query_and_pagination.spec.ts (Query filters, pagination, date ranges, actor search)
 * - audit_logs_scopes.spec.ts (Scope isolation for org, user, and system levels)
 * - audit_logs_http_projections.spec.ts (HTTP projections, privacy guards, permission enforcement)
 * - audit_logs_organization_governance.spec.ts (Governance flows, custom roles, transaction rollback)
 * - audit_logs_enterprise_integrity.spec.ts (Hash chain, tamper detection, forensic filters, ACL)
 */

import './audit_logs_query_and_pagination.spec.js'
import './audit_logs_scopes.spec.js'
import './audit_logs_http_projections.spec.js'
import './audit_logs_organization_governance.spec.js'
import './audit_logs_enterprise_integrity.spec.js'
