/**
 * Modular Aggregator for Review Disputes API Standardization Integration Tests.
 *
 * Decomposed in accordance with Clean Code (Robert C. Martin - Function, Class, Test chapters)
 * and SOLID principles (Single Responsibility Principle).
 *
 * Sub-suites:
 * - review_disputes_list_and_access.spec.ts (Admin & Org dispute listings, camelCase contract, guest/regular user guards)
 * - review_disputes_reporting.spec.ts (Two-sided exchange validation, dossier assembly, duplicate report prevention, rollback)
 * - review_disputes_ai_arbitration.spec.ts (Clawagent arbitration staging contract, automation actor fallback logging)
 * - review_disputes_interaction.spec.ts (Dispute counterparty responses, comments and evidences REST endpoints)
 */

import './review_disputes_list_and_access.spec.js'
import './review_disputes_reporting.spec.js'
import './review_disputes_ai_arbitration.spec.js'
import './review_disputes_interaction.spec.js'
